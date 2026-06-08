import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSymbolData: vi.fn(),
}));

vi.mock("@/lib/services/dataWarehouse", () => ({
  getSymbolData: mocks.getSymbolData,
}));

describe("GET /api/data/[symbol]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSymbolData.mockResolvedValue({
      symbol: "AAPL",
      stock: { symbol: "AAPL", name: "Apple" },
      dailyBars: [],
      intradaySnapshots: [],
      catalysts: [],
      analyses: [],
    });
  });

  it("returns symbol data for the route symbol", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/data/aapl"), { params: Promise.resolve({ symbol: "aapl" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getSymbolData).toHaveBeenCalledWith("aapl");
    expect(payload.symbol).toBe("AAPL");
  });
});
