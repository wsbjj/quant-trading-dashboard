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

  it("adds bilingual report copy without rewriting source catalyst titles", () => {
    const report = buildRuleBasedReport(sampleNormalizedStockData);

    expect(report.copy.zh.disclaimer).toContain("投资建议");
    expect(report.copy.en.disclaimer).toContain("educational purposes");
    expect(report.copy.zh.squeezeNotes.length).toBeGreaterThan(0);
    expect(report.copy.zh.smartMoney.length).toBeGreaterThan(0);
    expect(report.copy.zh.tradePlan.bullish.length).toBeGreaterThan(0);
    expect(report.sections.catalyst.events[0]?.title).toBe(sampleNormalizedStockData.catalysts[0]?.title);
  });

  it("uses X instead of explanatory text for missing squeeze source data", () => {
    const report = buildRuleBasedReport(sampleNormalizedStockData);

    expect(report.sections.squeeze.shortInterest.note).toBe("X");
    expect(report.copy.zh.squeezeNotes.slice(0, 3)).toEqual(["X", "X", "X"]);
    expect(report.copy.en.squeezeNotes.slice(0, 3)).toEqual(["X", "X", "X"]);
    expect(report.copy.zh.squeezeNotes.join(" ")).not.toContain("未提供");
    expect(report.copy.en.squeezeNotes.join(" ")).not.toMatch(/not available|no free source/i);
  });
});
