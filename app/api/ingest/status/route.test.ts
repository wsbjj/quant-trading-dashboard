import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIngestionStatus: vi.fn(),
}));

vi.mock("@/lib/services/ingestion", () => ({
  getIngestionStatus: mocks.getIngestionStatus,
}));

describe("GET /api/ingest/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FINNHUB_API_KEY = "do-not-leak";
    mocks.getIngestionStatus.mockResolvedValue({
      counts: {
        dailyBars: 10,
        intradaySnapshots: 20,
        catalysts: 5,
      },
      lastSuccessfulAt: {
        intraday: "2026-06-08T21:00:00.000Z",
        daily: null,
        events: null,
      },
      recentJobs: [],
      recentError: null,
    });
  });

  it("returns ingestion status without exposing API keys", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.counts).toEqual({ dailyBars: 10, intradaySnapshots: 20, catalysts: 5 });
    expect(JSON.stringify(payload)).not.toContain("do-not-leak");
  });
});
