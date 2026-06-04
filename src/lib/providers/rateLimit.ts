import type { ProviderName } from "../types";

export type ProviderLimit = {
  perSecond?: number;
  perMinute: number;
  perDay?: number;
};

export const PROVIDER_LIMITS: Record<ProviderName, ProviderLimit> = {
  finnhub: { perMinute: 60 },
  alphaVantage: { perMinute: 5, perDay: 25 },
  sec: { perSecond: 10, perMinute: 600 },
  openFda: { perMinute: 240, perDay: 120_000 },
  clinicalTrials: { perMinute: 30 },
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterMs: number;
  remainingMinute: number;
};

type Bucket = {
  minuteWindowStart: number;
  minuteCount: number;
  secondWindowStart: number;
  secondCount: number;
  dayWindowStart: number;
  dayCount: number;
};

type RateLimiterOptions = {
  now?: () => number;
};

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<ProviderName, Bucket>();

  function getBucket(provider: ProviderName): Bucket {
    const current = now();
    const existing = buckets.get(provider);
    if (existing) return existing;

    const created = {
      minuteWindowStart: current,
      minuteCount: 0,
      secondWindowStart: current,
      secondCount: 0,
      dayWindowStart: current,
      dayCount: 0,
    };
    buckets.set(provider, created);
    return created;
  }

  function check(provider: ProviderName): RateLimitDecision {
    const limit = PROVIDER_LIMITS[provider];
    const current = now();
    const bucket = getBucket(provider);

    if (current - bucket.minuteWindowStart >= MS_PER_MINUTE) {
      bucket.minuteWindowStart = current;
      bucket.minuteCount = 0;
    }
    if (current - bucket.secondWindowStart >= MS_PER_SECOND) {
      bucket.secondWindowStart = current;
      bucket.secondCount = 0;
    }
    if (current - bucket.dayWindowStart >= MS_PER_DAY) {
      bucket.dayWindowStart = current;
      bucket.dayCount = 0;
    }

    const minuteBlocked = bucket.minuteCount >= limit.perMinute;
    const secondBlocked = limit.perSecond !== undefined && bucket.secondCount >= limit.perSecond;
    const dayBlocked = limit.perDay !== undefined && bucket.dayCount >= limit.perDay;

    if (minuteBlocked || secondBlocked || dayBlocked) {
      const retryAfterMs = Math.max(
        minuteBlocked ? MS_PER_MINUTE - (current - bucket.minuteWindowStart) : 0,
        secondBlocked ? MS_PER_SECOND - (current - bucket.secondWindowStart) : 0,
        dayBlocked ? MS_PER_DAY - (current - bucket.dayWindowStart) : 0,
      );

      return {
        allowed: false,
        retryAfterMs,
        remainingMinute: Math.max(0, limit.perMinute - bucket.minuteCount),
      };
    }

    bucket.minuteCount += 1;
    bucket.secondCount += 1;
    bucket.dayCount += 1;

    return {
      allowed: true,
      retryAfterMs: 0,
      remainingMinute: Math.max(0, limit.perMinute - bucket.minuteCount),
    };
  }

  return { check };
}

export const globalRateLimiter = createRateLimiter();
