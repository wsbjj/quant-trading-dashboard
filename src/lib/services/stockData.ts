import { buildRuleBasedReport } from "../analysis/report";
import { getFixtureStockData } from "../fixtures/sampleStockData";
import { prisma } from "../prisma";
import type { CatalystEvent, CompanyProfile, NormalizedQuote, NormalizedStockData, SymbolSearchResult } from "../types";
import { getAlphaDailyBars } from "../providers/alphaVantage";
import { getClinicalTrialCatalysts } from "../providers/clinicalTrials";
import { getFinnhubCompanyNews, getFinnhubFilings, getFinnhubProfile, getFinnhubQuote, searchFinnhubSymbols } from "../providers/finnhub";
import { getOpenFdaCatalysts } from "../providers/openFda";
import { buildProviderStatuses } from "../providers/status";
import { getSecFilings } from "../providers/sec";
import { getApiKeyStatus } from "../env";
import { getAppSettings } from "./settings";
import { planMonitorBatch } from "./monitoring";
import { listWatchlist } from "./watchlist";

function mergeCatalysts(symbol: string, groups: CatalystEvent[][]) {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((event) => {
      const key = `${event.category}:${event.title}:${event.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((event) => ({ ...event, symbol: symbol.toUpperCase() }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function searchStocks(query: string): Promise<SymbolSearchResult[]> {
  if (query.trim().length < 1) return [];
  return searchFinnhubSymbols(query);
}

async function persistStock(profile: CompanyProfile) {
  await prisma.stock.upsert({
    where: { symbol: profile.symbol },
    update: {
      name: profile.name,
      exchange: profile.exchange,
      industry: profile.industry,
      country: profile.country,
      marketCap: profile.marketCap,
      shareOutstanding: profile.shareOutstanding,
      freeFloat: profile.freeFloat,
      website: profile.website,
    },
    create: {
      symbol: profile.symbol,
      name: profile.name,
      exchange: profile.exchange,
      industry: profile.industry,
      country: profile.country,
      marketCap: profile.marketCap,
      shareOutstanding: profile.shareOutstanding,
      freeFloat: profile.freeFloat,
      website: profile.website,
    },
  });
}

async function persistQuote(quote: NormalizedQuote) {
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
  await Promise.all(
    events.map((event) =>
      prisma.catalystRecord.upsert({
        where: { id: event.id },
        update: {
          title: event.title,
          summary: event.summary,
          eventDate: new Date(event.date),
          url: event.url,
          source: event.source,
          sentimentHint: event.sentimentHint,
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
        },
      }),
    ),
  );
}

export async function getNormalizedStockData(symbol: string): Promise<NormalizedStockData> {
  const normalizedSymbol = symbol.toUpperCase();
  const fixture = getFixtureStockData(normalizedSymbol);
  const historical = await settle(getAlphaDailyBars(normalizedSymbol), fixture.historical);
  const fallbackVolume = historical.at(-1)?.volume ?? fixture.quote.volume;

  const profile = await settle(getFinnhubProfile(normalizedSymbol), fixture.profile);
  const quote = await settle(getFinnhubQuote(normalizedSymbol, fallbackVolume), { ...fixture.quote, volume: fallbackVolume });
  const [news, finnhubFilings, secFilings, fda, trials] = await Promise.all([
    settle(getFinnhubCompanyNews(normalizedSymbol), fixture.catalysts.filter((event) => event.category === "news")),
    settle(getFinnhubFilings(normalizedSymbol), []),
    settle(getSecFilings(normalizedSymbol), []),
    settle(getOpenFdaCatalysts(normalizedSymbol, profile.name), []),
    settle(getClinicalTrialCatalysts(normalizedSymbol, profile.name), []),
  ]);

  const catalysts = mergeCatalysts(normalizedSymbol, [news, finnhubFilings, secFilings, fda, trials, fixture.catalysts]);
  const data: NormalizedStockData = {
    symbol: normalizedSymbol,
    quote: { ...quote, symbol: normalizedSymbol, volume: quote.volume || fallbackVolume },
    profile: { ...profile, symbol: normalizedSymbol },
    catalysts,
    historical,
    shortInterest: fixture.shortInterest,
    providerStatuses: buildProviderStatuses({
      keyStatus: getApiKeyStatus(),
      outcomes: {
        finnhub: profile.source === "finnhub" || quote.source === "finnhub" ? "ok" : undefined,
        alphaVantage: historical === fixture.historical ? undefined : "ok",
      },
    }),
  };

  await persistStock(data.profile);
  await persistQuote(data.quote);
  await persistCatalysts(catalysts.slice(0, 20));

  return data;
}

export async function getStockReport(symbol: string) {
  const data = await getNormalizedStockData(symbol);
  const report = buildRuleBasedReport(data);
  await prisma.analysisReportRecord.create({
    data: {
      symbol: report.symbol,
      reportJson: JSON.stringify(report),
    },
  });
  return report;
}

export async function getRealtimeQuoteSnapshot(symbol: string): Promise<NormalizedQuote> {
  const normalizedSymbol = symbol.toUpperCase();
  const fixture = getFixtureStockData(normalizedSymbol);
  const quote = await settle(getFinnhubQuote(normalizedSymbol), fixture.quote);
  const normalizedQuote = { ...quote, symbol: normalizedSymbol };

  await persistQuote(normalizedQuote);

  return normalizedQuote;
}

export async function getMonitorSnapshot() {
  const [settings, items] = await Promise.all([getAppSettings(), listWatchlist()]);
  const monitoredSymbols = items.filter((item) => item.isMonitored).map((item) => item.symbol);
  const cursorRow = await prisma.appSetting.findUnique({ where: { key: "monitorCursor" } });
  const plan = planMonitorBatch({
    symbols: monitoredSymbols,
    maxBatchSize: settings.maxMonitoredSymbols,
    cursor: Number(cursorRow?.value ?? 0),
  });
  const quotes = await Promise.all(plan.activeSymbols.map((symbol) => getRealtimeQuoteSnapshot(symbol)));

  await prisma.appSetting.upsert({
    where: { key: "monitorCursor" },
    update: { value: String(plan.nextCursor) },
    create: { key: "monitorCursor", value: String(plan.nextCursor) },
  });

  return {
    settings,
    staleCount: plan.staleSymbols.length,
    staleSymbols: plan.staleSymbols,
    nextCursor: plan.nextCursor,
    quotes,
  };
}
