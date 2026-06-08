import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDataOverview: vi.fn(),
}));

vi.mock("@/lib/services/dataWarehouse", () => ({
  getDataOverview: mocks.getDataOverview,
}));

describe("GET /api/data/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_API_KEY = "do-not-leak";
    mocks.getDataOverview.mockResolvedValue({
      counts: { dailyBars: 1, intradaySnapshots: 2, catalysts: 3, ingestionJobs: 4 },
      symbols: [{ symbol: "AAPL", name: "Apple", dailyBars: 1, intradaySnapshots: 2, catalysts: 3 }],
      recentJobs: [],
    });
  });

  it("returns data warehouse overview without exposing secrets", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.counts).toEqual({ dailyBars: 1, intradaySnapshots: 2, catalysts: 3, ingestionJobs: 4 });
    expect(JSON.stringify(payload)).not.toContain("do-not-leak");
  });
});
