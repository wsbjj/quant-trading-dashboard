import { prisma } from "../prisma";
import { getAlphaDailyBars } from "../providers/alphaVantage";
import { getClinicalTrialCatalysts } from "../providers/clinicalTrials";
import { getFinnhubCompanyNews, getFinnhubFilings, getFinnhubProfile, getFinnhubQuote } from "../providers/finnhub";
import { getOpenFdaCatalysts } from "../providers/openFda";
import { getSecFilings } from "../providers/sec";
import type { AlphaDailyBar, CatalystEvent, IngestionJobType, IngestionStatusPayload, IngestionSummary, NormalizedQuote } from "../types";
import { planMonitorBatch } from "./monitoring";
import { listWatchlist } from "./watchlist";

type IngestionOptions = {
  limit?: number;
  force?: boolean;
  trigger?: string;
};

type MutableSummary = Omit<IngestionSummary, "status"> & {
  status: "running" | "success" | "failed";
};

type JobRecord = {
  id: string;
  jobType: string;
  status: string;
  trigger: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  symbolCount: number;
  requestCount: number;
  insertedCount: number;
  updatedCount: number;
  errorMessage: string | null;
};

const CURSOR_KEYS: Record<IngestionJobType, string> = {
  intraday: "intradayIngestionCursor",
  daily: "dailyIngestionCursor",
  events: "eventIngestionCursor",
};

function clampLimit(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value ?? fallback)));
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function serializeJob(job: JobRecord) {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    trigger: job.trigger,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
    symbolCount: job.symbolCount,
    requestCount: job.requestCount,
    insertedCount: job.insertedCount,
    updatedCount: job.updatedCount,
    errorMessage: job.errorMessage,
  };
}

async function getMonitoredSymbols() {
  const items = await listWatchlist();
  return items.filter((item) => item.isMonitored).map((item) => item.symbol.toUpperCase());
}

async function planSymbols(jobType: IngestionJobType, limit: number) {
  const symbols = await getMonitoredSymbols();
  const cursorRow = await prisma.appSetting.findUnique({ where: { key: CURSOR_KEYS[jobType] } });
  const plan = planMonitorBatch({
    symbols,
    maxBatchSize: limit,
    cursor: Number(cursorRow?.value ?? 0),
  });

  await prisma.appSetting.upsert({
    where: { key: CURSOR_KEYS[jobType] },
    update: { value: String(plan.nextCursor) },
    create: { key: CURSOR_KEYS[jobType], value: String(plan.nextCursor) },
  });

  return plan.activeSymbols;
}

async function createJobRecord(jobType: IngestionJobType, trigger: string) {
  return prisma.dataIngestionJob.create({
    data: {
      jobType,
      status: "running",
      trigger,
    },
  });
}

async function finishJobRecord(summary: MutableSummary) {
  await prisma.dataIngestionJob.update({
    where: { id: summary.jobId },
    data: {
      status: summary.status,
      finishedAt: new Date(),
      symbolCount: summary.symbolCount,
      requestCount: summary.requestCount,
      insertedCount: summary.insertedCount,
      updatedCount: summary.updatedCount,
      errorMessage: summary.errorMessage ?? null,
    },
  });
}

async function runTrackedJob(
  jobType: IngestionJobType,
  trigger: string,
  run: (summary: MutableSummary) => Promise<void>,
): Promise<IngestionSummary> {
  const job = await createJobRecord(jobType, trigger);
  const summary: MutableSummary = {
    jobId: job.id,
    jobType,
    status: "running",
    trigger,
    symbols: [],
    symbolCount: 0,
    requestCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    errorMessage: null,
  };

  try {
    await run(summary);
    summary.status = "success";
    await finishJobRecord(summary);
    return summary;
  } catch (error) {
    summary.status = "failed";
    summary.errorMessage = error instanceof Error ? error.message : "Unknown ingestion failure";
    await finishJobRecord(summary);
    throw error;
  }
}

async function upsertDailyBar(symbol: string, bar: AlphaDailyBar) {
  const where = {
    symbol_date_source: {
      symbol,
      date: toUtcDate(bar.date),
      source: "alphaVantage",
    },
  };
  const existing = await prisma.dailyBar.findUnique({ where, select: { id: true } });

  await prisma.dailyBar.upsert({
    where,
    update: {
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      adjustedClose: bar.adjustedClose,
      volume: bar.volume,
      dividendAmount: bar.dividendAmount,
      splitCoefficient: bar.splitCoefficient,
    },
    create: {
      symbol,
      date: toUtcDate(bar.date),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      adjustedClose: bar.adjustedClose,
      volume: bar.volume,
      dividendAmount: bar.dividendAmount,
      splitCoefficient: bar.splitCoefficient,
      source: "alphaVantage",
    },
  });

  return existing ? "updated" : "inserted";
}

async function upsertIntradaySnapshot(quote: NormalizedQuote) {
  const asOf = new Date(quote.asOf);
  const where = {
    symbol_asOf_source: {
      symbol: quote.symbol,
      asOf,
      source: quote.source,
    },
  };
  const existing = await prisma.intradaySnapshot.findUnique({ where, select: { id: true } });

  await prisma.intradaySnapshot.upsert({
    where,
    update: {
      currentPrice: quote.currentPrice,
      change: quote.change,
      percentChange: quote.percentChange,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
    },
    create: {
      symbol: quote.symbol,
      currentPrice: quote.currentPrice,
      change: quote.change,
      percentChange: quote.percentChange,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
      source: quote.source,
      asOf,
    },
  });

  return existing ? "updated" : "inserted";
}

async function createQuoteSnapshot(quote: NormalizedQuote) {
  await prisma.quoteSnapshot.create({
    data: {
      symbol: quote.symbol,
      currentPrice: quote.currentPrice,
      change: quote.change,
      percentChange: quote.percentChange,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
      source: quote.source,
      asOf: new Date(quote.asOf),
    },
  });
}

async function persistCatalysts(events: CatalystEvent[]) {
  const results = await Promise.all(
    events.map((event) =>
      prisma.catalystRecord
        .findUnique({ where: { id: event.id }, select: { id: true } })
        .then(async (existing) => {
          await prisma.catalystRecord.upsert({
            where: { id: event.id },
            update: {
              title: event.title,
              summary: event.summary,
              eventDate: new Date(event.date),
              url: event.url,
              source: event.source,
              sentimentHint: event.sentimentHint,
              rawPayload: JSON.stringify(event),
            },
            create: {
              id: event.id,
              symbol: event.symbol,
              category: event.category,
              title: event.title,
              summary: event.summary,
              eventDate: new Date(event.date),
              url: event.url,
              source: event.source,
              sentimentHint: event.sentimentHint,
              rawPayload: JSON.stringify(event),
            },
          });
          return existing ? "updated" : "inserted";
        }),
    ),
  );

  return {
    inserted: results.filter((result) => result === "inserted").length,
    updated: results.filter((result) => result === "updated").length,
  };
}

export async function runDailyBarIngestion(options: IngestionOptions = {}) {
  const limit = clampLimit(options.limit, 25, 25);
  const trigger = options.trigger ?? "api";

  return runTrackedJob("daily", trigger, async (summary) => {
    const symbols = await planSymbols("daily", limit);
    summary.symbols = symbols;
    summary.symbolCount = symbols.length;

    for (const symbol of symbols) {
      const bars = await getAlphaDailyBars(symbol);
      summary.requestCount += 1;
      for (const bar of bars.slice(-100)) {
        const result = await upsertDailyBar(symbol, bar);
        if (result === "inserted") summary.insertedCount += 1;
        else summary.updatedCount += 1;
      }
    }
  });
}

export async function runIntradayIngestion(options: IngestionOptions = {}) {
  const limit = clampLimit(options.limit, 50, 50);
  const trigger = options.trigger ?? "api";

  return runTrackedJob("intraday", trigger, async (summary) => {
    const symbols = await planSymbols("intraday", limit);
    summary.symbols = symbols;
    summary.symbolCount = symbols.length;

    for (const symbol of symbols) {
      const quote = { ...(await getFinnhubQuote(symbol)), symbol };
      summary.requestCount += 1;
      const result = await upsertIntradaySnapshot(quote);
      await createQuoteSnapshot(quote);
      if (result === "inserted") summary.insertedCount += 1;
      else summary.updatedCount += 1;
    }
  });
}

export async function runEventIngestion(options: IngestionOptions = {}) {
  const limit = clampLimit(options.limit, 25, 25);
  const trigger = options.trigger ?? "api";

  return runTrackedJob("events", trigger, async (summary) => {
    const symbols = await planSymbols("events", limit);
    summary.symbols = symbols;
    summary.symbolCount = symbols.length;

    for (const symbol of symbols) {
      const profile = await getFinnhubProfile(symbol);
      const groups = await Promise.all([
        getFinnhubCompanyNews(symbol),
        getFinnhubFilings(symbol),
        getSecFilings(symbol),
        getOpenFdaCatalysts(symbol, profile.name),
        getClinicalTrialCatalysts(symbol, profile.name),
      ]);
      const events = groups.flat();
      summary.requestCount += 5;
      const counts = await persistCatalysts(events);
      summary.insertedCount += counts.inserted;
      summary.updatedCount += counts.updated;
    }
  });
}

export async function getIngestionStatus(): Promise<IngestionStatusPayload> {
  const [dailyBars, intradaySnapshots, catalysts, recentJobs, recentError, intradaySuccess, dailySuccess, eventsSuccess] = await Promise.all([
    prisma.dailyBar.count(),
    prisma.intradaySnapshot.count(),
    prisma.catalystRecord.count(),
    prisma.dataIngestionJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
    prisma.dataIngestionJob.findFirst({
      where: { status: "failed" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.dataIngestionJob.findFirst({
      where: { jobType: "intraday", status: "success" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.dataIngestionJob.findFirst({
      where: { jobType: "daily", status: "success" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.dataIngestionJob.findFirst({
      where: { jobType: "events", status: "success" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const successTime = (job: JobRecord | null) => (job ? (job.finishedAt ?? job.startedAt).toISOString() : null);

  return {
    counts: {
      dailyBars,
      intradaySnapshots,
      catalysts,
    },
    lastSuccessfulAt: {
      intraday: successTime(intradaySuccess),
      daily: successTime(dailySuccess),
      events: successTime(eventsSuccess),
    },
    recentJobs: recentJobs.map(serializeJob),
    recentError: recentError
      ? {
          jobType: recentError.jobType,
          errorMessage: recentError.errorMessage,
          finishedAt: (recentError.finishedAt ?? recentError.startedAt).toISOString(),
        }
      : null,
  };
}
