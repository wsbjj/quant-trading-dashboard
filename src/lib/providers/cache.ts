import { createHash } from "node:crypto";
import type { ProviderName } from "../types";

const SECRET_KEYS = new Set(["token", "apikey", "api_key", "key", "authorization"]);

export function makeCacheKey(
  provider: ProviderName,
  endpoint: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const scrubbedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .filter(([key]) => !SECRET_KEYS.has(key.toLowerCase()))
    .sort(([left], [right]) => left.localeCompare(right));

  const canonical = JSON.stringify({ provider, endpoint, params: scrubbedEntries });
  const digest = createHash("sha256").update(canonical).digest("hex").slice(0, 24);
  return `${provider}:${endpoint}:${digest}`;
}

export function isCacheFresh(createdAt: Date, ttlMs: number, now = new Date()) {
  return now.getTime() - createdAt.getTime() <= ttlMs;
}
