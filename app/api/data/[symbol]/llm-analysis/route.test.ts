import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSymbolLlmAnalysis: vi.fn(),
}));

class TestLlmConfigurationError extends Error {}

vi.mock("@/lib/services/dataWarehouse", () => ({
  LlmConfigurationError: TestLlmConfigurationError,
  runSymbolLlmAnalysis: mocks.runSymbolLlmAnalysis,
}));

describe("POST /api/data/[symbol]/llm-analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSymbolLlmAnalysis.mockResolvedValue({
      id: "analysis-1",
      symbol: "AAPL",
      model: "test-model",
      status: "success",
      createdAt: "2026-06-08T22:00:00.000Z",
      analysis: { trend: "偏多震荡" },
    });
  });

  it("returns 503 when LLM configuration is missing", async () => {
    mocks.runSymbolLlmAnalysis.mockRejectedValueOnce(new TestLlmConfigurationError("LLM is not configured"));
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/data/aapl/llm-analysis", { method: "POST" }), {
      params: Promise.resolve({ symbol: "aapl" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("LLM is not configured");
  });

  it("returns the saved LLM analysis", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/data/aapl/llm-analysis", { method: "POST" }), {
      params: Promise.resolve({ symbol: "aapl" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.runSymbolLlmAnalysis).toHaveBeenCalledWith("aapl");
    expect(payload.analysis).toMatchObject({ id: "analysis-1", status: "success" });
  });
});
