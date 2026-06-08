import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dailyBarCount: vi.fn(),
  dailyBarGroupBy: vi.fn(),
  dailyBarFindMany: vi.fn(),
  intradaySnapshotCount: vi.fn(),
  intradaySnapshotGroupBy: vi.fn(),
  intradaySnapshotFindMany: vi.fn(),
  catalystRecordCount: vi.fn(),
  catalystRecordGroupBy: vi.fn(),
  catalystRecordFindMany: vi.fn(),
  dataIngestionJobCount: vi.fn(),
  dataIngestionJobFindMany: vi.fn(),
  stockFindMany: vi.fn(),
  stockFindUnique: vi.fn(),
  llmAnalysisRecordFindMany: vi.fn(),
  llmAnalysisRecordCreate: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    dailyBar: {
      count: mocks.dailyBarCount,
      groupBy: mocks.dailyBarGroupBy,
      findMany: mocks.dailyBarFindMany,
    },
    intradaySnapshot: {
      count: mocks.intradaySnapshotCount,
      groupBy: mocks.intradaySnapshotGroupBy,
      findMany: mocks.intradaySnapshotFindMany,
    },
    catalystRecord: {
      count: mocks.catalystRecordCount,
      groupBy: mocks.catalystRecordGroupBy,
      findMany: mocks.catalystRecordFindMany,
    },
    dataIngestionJob: {
      count: mocks.dataIngestionJobCount,
      findMany: mocks.dataIngestionJobFindMany,
    },
    stock: {
      findMany: mocks.stockFindMany,
      findUnique: mocks.stockFindUnique,
    },
    llmAnalysisRecord: {
      findMany: mocks.llmAnalysisRecordFindMany,
      create: mocks.llmAnalysisRecordCreate,
    },
  },
}));

const dailyRows = Array.from({ length: 120 }, (_, index) => ({
  id: `daily-${index}`,
  symbol: "AAPL",
  date: new Date(Date.UTC(2026, 0, index + 1)),
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100.5 + index,
  adjustedClose: 100.25 + index,
  volume: 1_000 + index,
  dividendAmount: 0,
  splitCoefficient: 1,
  source: "alphaVantage",
  createdAt: new Date("2026-06-08T00:00:00.000Z"),
  updatedAt: new Date("2026-06-08T00:00:00.000Z"),
}));

const snapshotRows = Array.from({ length: 240 }, (_, index) => ({
  id: `snapshot-${index}`,
  symbol: "AAPL",
  currentPrice: 120 + index / 100,
  change: 0.5,
  percentChange: 0.4,
  open: 119,
  high: 121,
  low: 118,
  previousClose: 119.5,
  volume: 10_000 + index,
  source: "finnhub",
  asOf: new Date(Date.UTC(2026, 5, 8, 13, index)),
  createdAt: new Date("2026-06-08T00:00:00.000Z"),
  updatedAt: new Date("2026-06-08T00:00:00.000Z"),
}));

const eventRows = Array.from({ length: 60 }, (_, index) => ({
  id: `event-${index}`,
  symbol: "AAPL",
  category: "news",
  title: `Catalyst ${index}`,
  summary: `Summary ${index}`,
  eventDate: new Date(Date.UTC(2026, 5, index + 1)),
  url: "https://example.com",
  source: "finnhub",
  sentimentHint: "bullish",
  rawPayload: null,
  createdAt: new Date("2026-06-08T00:00:00.000Z"),
}));

describe("data warehouse service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;

    mocks.dailyBarCount.mockResolvedValue(120);
    mocks.intradaySnapshotCount.mockResolvedValue(240);
    mocks.catalystRecordCount.mockResolvedValue(60);
    mocks.dataIngestionJobCount.mockResolvedValue(1);
    mocks.dailyBarGroupBy.mockResolvedValue([
      { symbol: "AAPL", _count: { _all: 120 }, _max: { date: new Date("2026-06-08T00:00:00.000Z") } },
    ]);
    mocks.intradaySnapshotGroupBy.mockResolvedValue([
      { symbol: "AAPL", _count: { _all: 240 }, _max: { asOf: new Date("2026-06-08T21:00:00.000Z") } },
    ]);
    mocks.catalystRecordGroupBy.mockResolvedValue([
      { symbol: "AAPL", _count: { _all: 60 }, _max: { eventDate: new Date("2026-06-07T00:00:00.000Z") } },
    ]);
    mocks.stockFindMany.mockResolvedValue([{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ", industry: "Technology" }]);
    mocks.stockFindUnique.mockResolvedValue({ symbol: "AAPL", name: "Apple", exchange: "NASDAQ", industry: "Technology" });
    mocks.dataIngestionJobFindMany.mockResolvedValue([
      {
        id: "job-1",
        jobType: "daily",
        status: "success",
        trigger: "api-cron",
        startedAt: new Date("2026-06-08T21:00:00.000Z"),
        finishedAt: new Date("2026-06-08T21:00:01.000Z"),
        symbolCount: 1,
        requestCount: 1,
        insertedCount: 100,
        updatedCount: 0,
        errorMessage: null,
      },
    ]);
    mocks.dailyBarFindMany.mockResolvedValue(dailyRows.slice(-100).reverse());
    mocks.intradaySnapshotFindMany.mockResolvedValue(snapshotRows.slice(-200).reverse());
    mocks.catalystRecordFindMany.mockResolvedValue(eventRows.slice(-50).reverse());
    mocks.llmAnalysisRecordFindMany.mockResolvedValue([]);
    mocks.llmAnalysisRecordCreate.mockImplementation((input) =>
      Promise.resolve({
        id: "analysis-1",
        createdAt: new Date("2026-06-08T22:00:00.000Z"),
        ...input.data,
      }),
    );
  });

  it("returns overview counts, symbol coverage and recent ingestion jobs", async () => {
    const { getDataOverview } = await import("./dataWarehouse");

    const overview = await getDataOverview();

    expect(overview.counts).toEqual({ dailyBars: 120, intradaySnapshots: 240, catalysts: 60, ingestionJobs: 1 });
    expect(overview.symbols).toEqual([
      expect.objectContaining({
        symbol: "AAPL",
        name: "Apple",
        dailyBars: 120,
        intradaySnapshots: 240,
        catalysts: 60,
        lastDailyDate: "2026-06-08T00:00:00.000Z",
      }),
    ]);
    expect(overview.recentJobs[0]).toMatchObject({ id: "job-1", status: "success" });
  });

  it("returns symbol detail with bounded daily, intraday, event and LLM windows", async () => {
    const { getSymbolData } = await import("./dataWarehouse");

    const detail = await getSymbolData("aapl");

    expect(detail.symbol).toBe("AAPL");
    expect(mocks.dailyBarFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(mocks.intradaySnapshotFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    expect(mocks.catalystRecordFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
    expect(mocks.llmAnalysisRecordFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(detail.dailyBars).toHaveLength(100);
    expect(detail.intradaySnapshots).toHaveLength(200);
    expect(detail.catalysts).toHaveLength(50);
  });

  it("does not call fetch or save records when LLM configuration is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { LlmConfigurationError, runSymbolLlmAnalysis } = await import("./dataWarehouse");

    await expect(runSymbolLlmAnalysis("AAPL")).rejects.toBeInstanceOf(LlmConfigurationError);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.llmAnalysisRecordCreate).not.toHaveBeenCalled();
  });

  it("calls an OpenAI-compatible endpoint and saves successful JSON analysis", async () => {
    process.env.LLM_API_KEY = "llm-key";
    process.env.LLM_BASE_URL = "https://llm.example.com/v1";
    process.env.LLM_MODEL = "test-model";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    trend: "偏多震荡",
                    supportResistance: ["120 支撑", "130 压力"],
                    volumeObservation: "成交量温和放大",
                    catalystImpact: "事件偏正面",
                    scenarios: { bullish: ["突破后观察"], neutral: ["区间震荡"], bearish: ["跌破支撑"] },
                    invalidation: ["跌破 118"],
                    risks: ["流动性风险"],
                    dataGaps: ["缺少付费做空数据"],
                    disclaimer: "仅用于教育用途，不构成投资建议。",
                  }),
                },
              },
            ],
          }),
      }),
    );
    const { runSymbolLlmAnalysis } = await import("./dataWarehouse");

    const result = await runSymbolLlmAnalysis("AAPL");

    expect(fetch).toHaveBeenCalledWith(
      "https://llm.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer llm-key" }),
      }),
    );
    expect(result.status).toBe("success");
    expect(result.analysis).not.toBeNull();
    expect(result.analysis?.trend).toBe("偏多震荡");
    expect(mocks.llmAnalysisRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          symbol: "AAPL",
          model: "test-model",
          status: "success",
        }),
      }),
    );
  });

  it("saves a failed LLM record when the provider returns non-JSON content", async () => {
    process.env.LLM_API_KEY = "llm-key";
    process.env.LLM_BASE_URL = "https://llm.example.com/v1";
    process.env.LLM_MODEL = "test-model";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "not json" } }] }),
      }),
    );
    const { LlmProviderError, runSymbolLlmAnalysis } = await import("./dataWarehouse");

    await expect(runSymbolLlmAnalysis("AAPL")).rejects.toBeInstanceOf(LlmProviderError);

    expect(mocks.llmAnalysisRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          symbol: "AAPL",
          status: "failed",
          errorMessage: expect.stringContaining("valid JSON"),
        }),
      }),
    );
  });
});
