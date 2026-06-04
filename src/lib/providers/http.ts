import type { ProviderName } from "../types";
import { globalRateLimiter } from "./rateLimit";

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export async function fetchProviderJson<T>(
  provider: ProviderName,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const decision = globalRateLimiter.check(provider);
  if (!decision.allowed) {
    throw new ProviderError(`Rate limited: retry after ${decision.retryAfterMs}ms`, provider, 429);
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ProviderError(`Provider ${provider} failed with HTTP ${response.status}`, provider, response.status);
  }

  return (await response.json()) as T;
}
