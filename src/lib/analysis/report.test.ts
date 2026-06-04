import { describe, expect, it } from "vitest";
import { buildRuleBasedReport } from "./report";
import { sampleNormalizedStockData } from "../fixtures/sampleStockData";

describe("rule based stock report", () => {
  it("generates a complete report without paid short-interest or LLM data", () => {
    const report = buildRuleBasedReport(sampleNormalizedStockData);

    expect(report.symbol).toBe("AIM");
    expect(report.sections.catalyst.grade.label).toMatch(/bullish/i);
    expect(report.sections.squeeze.shortInterest.status).toBe("unavailable");
    expect(report.sections.tradePlan.bullish.length).toBeGreaterThan(0);
    expect(report.disclaimer).toContain("教育用途");
  });
});
