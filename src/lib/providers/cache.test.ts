import { describe, expect, it } from "vitest";
import { isCacheFresh, makeCacheKey } from "./cache";

describe("provider cache helpers", () => {
  it("builds stable cache keys from provider, endpoint and params", () => {
    const first = makeCacheKey("finnhub", "/quote", { symbol: "AIM", token: "secret" });
    const second = makeCacheKey("finnhub", "/quote", { token: "secret", symbol: "AIM" });

    expect(first).toBe(second);
    expect(first).not.toContain("secret");
  });

  it("treats cache entries as stale after ttl expires", () => {
    expect(isCacheFresh(new Date("2026-06-04T10:00:00Z"), 30_000, new Date("2026-06-04T10:00:20Z"))).toBe(true);
    expect(isCacheFresh(new Date("2026-06-04T10:00:00Z"), 30_000, new Date("2026-06-04T10:00:31Z"))).toBe(false);
  });
});
