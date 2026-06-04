import { prisma } from "../prisma";
import type { ProviderName } from "../types";
import { isCacheFresh, makeCacheKey } from "./cache";

type CachedRequestOptions<T> = {
  provider: ProviderName;
  endpoint: string;
  params: Record<string, string | number | boolean | null | undefined>;
  ttlMs: number;
  fetcher: () => Promise<T>;
  force?: boolean;
};

export async function cachedProviderRequest<T>({
  provider,
  endpoint,
  params,
  ttlMs,
  fetcher,
  force = false,
}: CachedRequestOptions<T>): Promise<{ data: T; cacheStatus: "hit" | "miss" | "bypass" }> {
  const cacheKey = makeCacheKey(provider, endpoint, params);

  if (!force) {
    const cached = await prisma.apiCache.findUnique({ where: { cacheKey } });
    if (cached && isCacheFresh(cached.createdAt, ttlMs) && cached.expiresAt.getTime() > Date.now()) {
      return { data: JSON.parse(cached.payload) as T, cacheStatus: "hit" };
    }
  }

  const data = await fetcher();
  await prisma.apiCache.upsert({
    where: { cacheKey },
    update: {
      payload: JSON.stringify(data),
      statusCode: 200,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    },
    create: {
      cacheKey,
      provider,
      endpoint,
      payload: JSON.stringify(data),
      statusCode: 200,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  return { data, cacheStatus: force ? "bypass" : "miss" };
}
