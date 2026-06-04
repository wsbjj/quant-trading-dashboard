import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyProfile, HistoricalBar, NormalizedQuote } from "../types";

const mocks = vi.hoisted(() => ({
  appSettingFindUnique: vi.fn(),
  appSettingUpsert: vi.fn(),
  stockUpsert: vi.fn(),
  quoteSnapshotCreate: vi.fn(),
  catalystRecordUpsert: vi.fn(),
  analysisReportCreate: vi.fn(),
  getAppSettings: vi.fn(),
  listWatchlist: vi.fn(),
  getAlphaDailyBars: vi.fn(),
  getFinnhubQuote: vi.fn(),
  getFinnhubProfile: vi.fn(),
  getFinnhubCompanyNews: vi.fn(),
  getFinnhubFilings: vi.fn(),
  getSecFilings: vi.fn(),
  getOpenFdaCatalysts: vi.fn(),
  getClinicalTrialCatalysts: vi.fn(),
  getApiKeyStatus: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    appSetting: {
      findUnique: mocks.appSettingFindUnique,
      upsert: mocks.appSettingUpsert,
    },
    stock: {
      upsert: mocks.stockUpsert,
    },
    quoteSnapshot: {
      create: mocks.quoteSnapshotCreate,
    },
    catalystRecord: {
      upsert: mocks.catalystRecordUpsert,
    },
    analysisReportRecord: {
      create: mocks.analysisReportCreate,
    },
  },
}));

vi.mock("./settings", () => ({
  getAppSettings: mocks.getAppSettings,
}));

vi.mock("./watchlist", () => ({
  listWatchlist: mocks.listWatchlist,
}));

vi.mock("../providers/alphaVantage", () => ({
  getAlphaDailyBars: mocks.getAlphaDailyBars,
}));

vi.mock("../providers/finnhub", () => ({
  getFinnhubQuote: mocks.getFinnhubQuote,
  getFinnhubProfile: mocks.getFinnhubProfile,
  getFinnhubCompanyNews: mocks.getFinnhubCompanyNews,
  getFinnhubFilings: mocks.getFinnhubFilings,
  searchFinnhubSymbols: vi.fn(),
}));

vi.mock("../providers/sec", () => ({
  getSecFilings: mocks.getSecFilings,
}));

vi.mock("../providers/openFda", () => ({
  getOpenFdaCatalysts: mocks.getOpenFdaCatalysts,
}));

vi.mock("../providers/clinicalTrials", () => ({
  getClinicalTrialCatalysts: mocks.getClinicalTrialCatalysts,
}));

vi.mock("../env", () => ({
  getApiKeyStatus: mocks.getApiKeyStatus,
}));

const historicalBars: HistoricalBar[] = [
  { date: "2026-06-01", open: 1, high: 1.2, low: 0.9, close: 1.1, volume: 100_000 },
];

const quote = (symbol: string): NormalizedQuote => ({
  symbol,
  currentPrice: symbol === "AIM" ? 0.72 : 42.35,
  change: 0.04,
  percentChange: 5.88,
  open: 0.68,
  high: 0.74,
  low: 0.66,
  previousClose: 0.68,
  volume: 500_000,
  afterHoursPrice: null,
  marketState: "unknown",
  asOf: "2026-06-04T12:00:00.000Z",
  source: "finnhub",
});

const profile = (symbol: string): CompanyProfile => ({
  symbol,
  name: `${symbol} Corp`,
  exchange: "NASDAQ",
  industry: "Biotech",
  marketCap: 10_000_000,
  shareOutstanding: 20_000_000,
  freeFloat: 18_000_000,
  country: "US",
  website: null,
  source: "finnhub",
});

describe("getMonitorSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppSettings.mockResolvedValue({
      refreshIntervalSeconds: 30,
      maxMonitoredSymbols: 25,
      refreshRisk: { level: "normal", estimatedFinnhubCallsPerMinute: 50, message: "ok" },
      apiKeyStatus: {},
      apiLimits: [],
    });
    mocks.listWatchlist.mockResolvedValue([
      { symbol: "AIM", isMonitored: true, stock: { symbol: "AIM", name: "AIM ImmunoTech" } },
      { symbol: "AAPL", isMonitored: true, stock: { symbol: "AAPL", name: "Apple" } },
      { symbol: "MSFT", isMonitored: false, stock: { symbol: "MSFT", name: "Microsoft" } },
    ]);
    mocks.appSettingFindUnique.mockResolvedValue({ key: "monitorCursor", value: "0" });
    mocks.appSettingUpsert.mockResolvedValue({});
    mocks.stockUpsert.mockResolvedValue({});
    mocks.quoteSnapshotCreate.mockResolvedValue({});
    mocks.catalystRecordUpsert.mockResolvedValue({});
    mocks.analysisReportCreate.mockResolvedValue({});
    mocks.getAlphaDailyBars.mockResolvedValue(historicalBars);
    mocks.getFinnhubQuote.mockImplementation((symbol: string) => Promise.resolve(quote(symbol)));
    mocks.getFinnhubProfile.mockImplementation((symbol: string) => Promise.resolve(profile(symbol)));
    mocks.getFinnhubCompanyNews.mockResolvedValue([]);
    mocks.getFinnhubFilings.mockResolvedValue([]);
    mocks.getSecFilings.mockResolvedValue([]);
    mocks.getOpenFdaCatalysts.mockResolvedValue([]);
    mocks.getClinicalTrialCatalysts.mockResolvedValue([]);
    mocks.getApiKeyStatus.mockReturnValue({
      finnhub: true,
      alphaVantage: true,
      openFda: false,
      secUserAgent: true,
      llm: false,
    });
  });

  it("polls only realtime quotes for monitored symbols", async () => {
    const { getMonitorSnapshot } = await import("./stockData");

    const snapshot = await getMonitorSnapshot();

    expect(snapshot.quotes.map((item) => item.symbol)).toEqual(["AIM", "AAPL"]);
    expect(mocks.getFinnhubQuote).toHaveBeenCalledTimes(2);
    expect(mocks.quoteSnapshotCreate).toHaveBeenCalledTimes(2);
    expect(mocks.getAlphaDailyBars).not.toHaveBeenCalled();
    expect(mocks.getFinnhubProfile).not.toHaveBeenCalled();
    expect(mocks.getFinnhubCompanyNews).not.toHaveBeenCalled();
    expect(mocks.getFinnhubFilings).not.toHaveBeenCalled();
    expect(mocks.getSecFilings).not.toHaveBeenCalled();
    expect(mocks.getOpenFdaCatalysts).not.toHaveBeenCalled();
    expect(mocks.getClinicalTrialCatalysts).not.toHaveBeenCalled();
  });
});
