// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LlmAnalysisPanel from "./LlmAnalysisPanel";

describe("LlmAnalysisPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("runs manual analysis and renders the returned trade plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            analysis: {
              id: "analysis-1",
              symbol: "AAPL",
              model: "test-model",
              promptVersion: "trade-plan-v1",
              status: "success",
              inputSummary: "{}",
              rawResponse: "{}",
              errorMessage: null,
              createdAt: "2026-06-08T22:00:00.000Z",
              analysis: {
                trend: "偏多震荡",
                supportResistance: ["120 支撑"],
                volumeObservation: "成交量温和放大",
                catalystImpact: "事件偏正面",
                scenarios: {
                  bullish: ["突破后观察"],
                  neutral: ["区间震荡"],
                  bearish: ["跌破支撑"],
                },
                invalidation: ["跌破 118"],
                risks: ["流动性风险"],
                dataGaps: ["缺少做空数据"],
                disclaimer: "仅用于教育用途，不构成投资建议。",
              },
            },
          }),
      }),
    );

    render(<LlmAnalysisPanel symbol="AAPL" initialAnalyses={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /手动分析/ }));

    await waitFor(() => expect(screen.getByText("偏多震荡")).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith("/api/data/AAPL/llm-analysis", { method: "POST" });
  });
});
