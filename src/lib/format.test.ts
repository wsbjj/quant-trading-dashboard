import { describe, expect, it } from "vitest";
import { formatCompact, formatPercent, formatPrice } from "./format";

describe("format helpers", () => {
  it("renders missing numeric values as X", () => {
    expect(formatPrice(null)).toBe("X");
    expect(formatCompact(undefined)).toBe("X");
    expect(formatPercent(Number.NaN)).toBe("X");
  });
});
