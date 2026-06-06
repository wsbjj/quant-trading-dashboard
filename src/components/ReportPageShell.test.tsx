// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildRuleBasedReport } from "../lib/analysis/report";
import { sampleNormalizedStockData } from "../lib/fixtures/sampleStockData";
import ReportPageShell from "./ReportPageShell";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const report = buildRuleBasedReport(sampleNormalizedStockData);

describe("ReportPageShell language switching", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to Chinese and switches to English with localStorage persistence", () => {
    render(<ReportPageShell report={report} />);

    expect(screen.getByText("挤压分析")).toBeTruthy();
    expect(screen.getByText("交易计划")).toBeTruthy();
    expect(screen.getByText("关键风险因素")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(window.localStorage.getItem("reportLanguage")).toBe("en");
    expect(screen.getByText("SQUEEZE ANALYSIS")).toBeTruthy();
    expect(screen.getByText("TRADE PLAN")).toBeTruthy();
    expect(screen.getByText("KEY RISK FACTORS")).toBeTruthy();
  });

  it("uses a saved English preference on initial render", async () => {
    window.localStorage.setItem("reportLanguage", "en");

    render(<ReportPageShell report={report} />);

    await waitFor(() => expect(screen.getByText("SQUEEZE ANALYSIS")).toBeTruthy());
  });

  it("falls back to Chinese when localStorage contains an invalid language", async () => {
    window.localStorage.setItem("reportLanguage", "fr");

    render(<ReportPageShell report={report} />);

    await waitFor(() => expect(screen.getByText("挤压分析")).toBeTruthy());
  });

  it("renders missing data as X without explanatory missing-data text", () => {
    render(<ReportPageShell report={report} />);

    expect(screen.getAllByText("X").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/未提供|N\/A|not available|no free source/i)).toBeNull();
  });
});
