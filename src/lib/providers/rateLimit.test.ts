import { describe, expect, it } from "vitest";
import { createRateLimiter, PROVIDER_LIMITS } from "./rateLimit";

describe("provider rate limiter", () => {
  it("allows requests under a provider minute limit and blocks the next request", () => {
    const limiter = createRateLimiter({ now: () => 1_000 });

    for (let index = 0; index < PROVIDER_LIMITS.finnhub.perMinute; index += 1) {
      expect(limiter.check("finnhub").allowed).toBe(true);
    }

    const blocked = limiter.check("finnhub");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets minute windows independently per provider", () => {
    let now = 1_000;
    const limiter = createRateLimiter({ now: () => now });

    for (let index = 0; index < PROVIDER_LIMITS.clinicalTrials.perMinute; index += 1) {
      limiter.check("clinicalTrials");
    }

    expect(limiter.check("clinicalTrials").allowed).toBe(false);
    now += 60_001;
    expect(limiter.check("clinicalTrials").allowed).toBe(true);
    expect(limiter.check("finnhub").allowed).toBe(true);
  });
});
