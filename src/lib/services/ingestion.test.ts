import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AlphaDailyBar } from "../types";

const mocks = vi.hoisted(() => ({
  now: new Date("2026-06-08T21:05:00.000Z"),
  watchlist: [
    { symbol: "AIM", isMonitored: true, stock: { symbol: "AIM", name: "AIM ImmunoTech" } },
    { symbol: "AAPL", isMonitored: true, stock: { symbol: "AAPL", name: "Apple" } },
    { symbol: "MSFT", isMonitored: true, stock: { symbol: "MSFT", name: "Microsoft" } },
    { symbol: "TSLA", isMonitored: false, stock: { symbol: "TSLA", name: "Tesla" } },
  ],
  listWatchlist: vi.fn(),
  getFinnhubQuote: vi.fn(),
  getAlphaDailyBars: vi.fn(),
  getFinnhubProfile: vi.fn(),
  getFinnhubCompanyNews: vi.fn(),
  getFinnhubFilings: vi.fn(),
  getSecFilings: vi.fn(),
  getOpenFdaCatalysts: vi.fn(),
  getClinicalTrialCatalysts: vi.fn(),
  dataIngestionJobCreate: vi.fn(),
  dataIngestionJobUpdate: vi.fn(),
  appSettingFindUnique: vi.fn(),
  appSettingUpsert: vi.fn(),
  dailyBarFindUnique: vi.fn(),
  dailyBarUpsert: vi.fn(),
  dailyBarCount: vi.fn(),
  intradaySnapshotFindUnique: vi.fn(),
  intradaySnapshotUpsert: vi.fn(),
  intradaySnapshotCount: vi.fn(),
  quoteSnapshotCreate: vi.fn(),
  catalystRecordFindUnique: vi.fn(),
  catalystRecordUpsert: vi.fn(),
  catalystRecordCount: vi.fn(),
  dataIngestionJobFindMany: vi.fn(),
  dataIngestionJobFindFirst: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    dataIngestionJob: {
      create: mocks.dataIngestionJobCreate,
      update: mocks.dataIngestionJobUpdate,
      findMany: mocks.dataIngestionJobFindMany,
      findFirst: mocks.dataIngestionJobFindFirst,
    },
    appSetting: {
      findUnique: mocks.appSettingFindUnique,
      upsert: mocks.appSettingUpsert,
    },
    dailyBar: {
      findUnique: mocks.dailyBarFindUnique,
      upsert: mocks.dailyBarUpsert,
      count: mocks.dailyBarCount,
    },
    intradaySnapshot: {
      findUnique: mocks.intradaySnapshotFindUnique,
      upsert: mocks.intradaySnapshotUpsert,
      count: mocks.intradaySnapshotCount,
    },
    quoteSnapshot: {
      create: mocks.quoteSnapshotCreate,
    },
    catalystRecord: {
      findUnique: mocks.catalystRecordFindUnique,
      upsert: mocks.catalystRecordUpsert,
      count: mocks.catalystRecordCount,
    },
  },
}));

vi.mock("./watchlist", () => ({
  listWatchlist: mocks.listWatchlist,
}));

vi.mock("../providers/finnhub", () => ({
  getFinnhubQuote: mocks.getFinnhubQuote,
  getFinnhubProfile: mocks.getFinnhubProfile,
  getFinnhubCompanyNews: mocks.getFinnhubCompanyNews,
  getFinnhubFilings: mocks.getFinnhubFilings,
}));

vi.mock("../providers/alphaVantage", () => ({
  getAlphaDailyBars: mocks.getAlphaDailyBars,
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

const alphaBars: AlphaDailyBar[] = [
  {
    date: "2026-06-06",
    open: 1,
    high: 1.2,
    low: 0.9,
    close: 1.1,
    adjustedClose: 1.08,
    volume: 100_000,
    dividendAmount: 0,
    splitCoefficient: 1,
  },
  {
    date: "2026-06-07",
    open: 1.1,
    high: 1.3,
    low: 1,
    close: 1.2,
    adjustedClose: 1.18,
    volume: 120_000,
    dividendAmount: 0,
    splitCoefficient: 1,
  },
];

describe("ingestion services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mocks.now);
    mocks.listWatchlist.mockResolvedValue(mocks.watchlist);
    mocks.dataIngestionJobCreate.mockResolvedValue({ id: "job-1" });
    mocks.dataIngestionJobUpdate.mockImplementation((input) => Promise.resolve(input.data));
    mocks.appSettingFindUnique.mockImplementation(({ where }: { where: { key: string } }) =>
      Promise.resolve(where.key === "dailyIngestionCursor" ? { key: "dailyIngestionCursor", value: "1" } : null),
    );
    mocks.appSettingUpsert.mockResolvedValue({});
    mocks.getAlphaDailyBars.mockResolvedValue(alphaBars);
    mocks.dailyBarFindUnique.mockResolvedValue(null);
    mocks.dailyBarUpsert.mockResolvedValue({ id: "daily-bar" });
    mocks.dailyBarCount.mockResolvedValue(10);
    mocks.intradaySnapshotCount.mockResolvedValue(20);
    mocks.catalystRecordCount.mockResolvedValue(5);
    mocks.dataIngestionJobFindMany.mockResolvedValue([
      {
        id: "job-2",
        jobType: "intraday",
        status: "success",
        trigger: "api-cron",
        startedAt: new Date("2026-06-08T21:00:00.000Z"),
        finishedAt: new Date("2026-06-08T21:00:02.000Z"),
        symbolCount: 2,
        requestCount: 2,
        insertedCount: 2,
        updatedCount: 0,
        errorMessage: null,
      },
    ]);
    mocks.dataIngestionJobFindFirst.mockImplementation(({ where }: { where: { jobType?: string; status: string } }) => {
      if (where.status === "failed") {
        return Promise.resolve({
          id: "job-failed",
          jobType: "daily",
          status: "failed",
          trigger: "api-cron",
          startedAt: new Date("2026-06-08T20:00:00.000Z"),
          finishedAt: new Date("2026-06-08T20:00:03.000Z"),
          symbolCount: 1,
          requestCount: 1,
          insertedCount: 0,
          updatedCount: 0,
          errorMessage: "alpha down",
        });
      }
      if (where.jobType === "intraday") {
        return Promise.resolve({
          id: "job-2",
          jobType: "intraday",
          status: "success",
          trigger: "api-cron",
          startedAt: new Date("2026-06-08T21:00:00.000Z"),
          finishedAt: new Date("2026-06-08T21:00:02.000Z"),
          symbolCount: 2,
          requestCount: 2,
          insertedCount: 2,
          updatedCount: 0,
          errorMessage: null,
        });
      }
      return Promise.resolve(null);
    });
    mocks.getFinnhubQuote.mockImplementation((symbol: string) =>
      Promise.resolve({
        symbol,
        currentPrice: 1.25,
        change: 0.05,
        percentChange: 4.16,
        open: 1.2,
        high: 1.3,
        low: 1.1,
        previousClose: 1.2,
        volume: 123_456,
        afterHoursPrice: null,
        marketState: "unknown",
        asOf: "2026-06-08T21:00:00.000Z",
        source: "finnhub",
      }),
    );
    mocks.intradaySnapshotFindUnique.mockResolvedValue(null);
    mocks.intradaySnapshotUpsert.mockResolvedValue({ id: "snapshot" });
    mocks.quoteSnapshotCreate.mockResolvedValue({});
    mocks.getFinnhubProfile.mockImplementation((symbol: string) => Promise.resolve({ symbol, name: `${symbol} Corp`, source: "finnhub" }));
    mocks.getFinnhubCompanyNews.mockResolvedValue([]);
    mocks.getFinnhubFilings.mockResolvedValue([]);
    mocks.getSecFilings.mockResolvedValue([]);
    mocks.getOpenFdaCatalysts.mockResolvedValue([]);
    mocks.getClinicalTrialCatalysts.mockResolvedValue([]);
    mocks.catalystRecordFindUnique.mockResolvedValue(null);
    mocks.catalystRecordUpsert.mockResolvedValue({});
  });

  it("rotates daily ingestion by cursor and upserts daily bars without duplicates", async () => {
    const { runDailyBarIngestion } = await import("./ingestion");

    const summary = await runDailyBarIngestion({ limit: 1, trigger: "api" });

    expect(summary.symbols).toEqual(["AAPL"]);
    expect(mocks.getAlphaDailyBars).toHaveBeenCalledWith("AAPL");
    expect(mocks.dailyBarUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.dailyBarUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { symbol_date_source: { symbol: "AAPL", date: new Date("2026-06-06T00:00:00.000Z"), source: "alphaVantage" } },
      }),
    );
    expect(mocks.appSettingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "dailyIngestionCursor" },
        update: { value: "2" },
      }),
    );
    expect(summary.insertedCount).toBe(2);
    expect(mocks.dataIngestionJobUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "success", symbolCount: 1, requestCount: 1, insertedCount: 2 }),
      }),
    );
  });

  it("upserts intraday snapshots by symbol, timestamp and source while keeping quote snapshots", async () => {
    const { runIntradayIngestion } = await import("./ingestion");

    const summary = await runIntradayIngestion({ limit: 2, trigger: "api" });

    expect(summary.symbols).toEqual(["AIM", "AAPL"]);
    expect(mocks.intradaySnapshotUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.intradaySnapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { symbol_asOf_source: { symbol: "AIM", asOf: new Date("2026-06-08T21:00:00.000Z"), source: "finnhub" } },
      }),
    );
    expect(mocks.quoteSnapshotCreate).toHaveBeenCalledTimes(2);
    expect(summary.insertedCount).toBe(2);
  });

  it("records failed ingestion jobs", async () => {
    mocks.getAlphaDailyBars.mockRejectedValueOnce(new Error("alpha down"));
    const { runDailyBarIngestion } = await import("./ingestion");

    await expect(runDailyBarIngestion({ limit: 1, trigger: "api" })).rejects.toThrow("alpha down");

    expect(mocks.dataIngestionJobUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "failed", errorMessage: "alpha down" }),
      }),
    );
  });

  it("counts existing daily bars as updates", async () => {
    mocks.dailyBarFindUnique.mockResolvedValue({ id: "existing-daily-bar" });
    const { runDailyBarIngestion } = await import("./ingestion");

    const summary = await runDailyBarIngestion({ limit: 1, trigger: "api" });

    expect(summary.insertedCount).toBe(0);
    expect(summary.updatedCount).toBe(2);
    expect(mocks.dataIngestionJobUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ insertedCount: 0, updatedCount: 2 }),
      }),
    );
  });

  it("returns ingestion status with counts, recent jobs and last success timestamps", async () => {
    const { getIngestionStatus } = await import("./ingestion");

    const status = await getIngestionStatus();

    expect(status.counts).toEqual({ dailyBars: 10, intradaySnapshots: 20, catalysts: 5 });
    expect(status.lastSuccessfulAt).toEqual({
      intraday: "2026-06-08T21:00:02.000Z",
      daily: null,
      events: null,
    });
    expect(status.recentJobs[0]).toMatchObject({ id: "job-2", startedAt: "2026-06-08T21:00:00.000Z" });
    expect(status.recentError).toEqual({
      jobType: "daily",
      errorMessage: "alpha down",
      finishedAt: "2026-06-08T20:00:03.000Z",
    });
  });
});
