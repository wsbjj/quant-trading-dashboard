import { getServerEnv } from "../env";
import { getFixtureStockData } from "../fixtures/sampleStockData";
import type { AlphaDailyBar, HistoricalBar } from "../types";
import { fetchProviderJson } from "./http";
import { cachedProviderRequest } from "./requestCache";

const BASE_URL = "https://www.alphavantage.co/query";

type DailyResponse = {
  "Time Series (Daily)"?: Record<string, Record<string, string>>;
  [key: string]: unknown;
};

function readNumber(value: string | undefined, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDailyBars(bars: HistoricalBar[]): AlphaDailyBar[] {
  return bars.slice(-100).map((bar) => ({
    ...bar,
    adjustedClose: bar.adjustedClose ?? bar.close,
    dividendAmount: bar.dividendAmount ?? 0,
    splitCoefficient: bar.splitCoefficient ?? 1,
  }));
}

export function parseAlphaDailyBars(data: DailyResponse, limit = 100): AlphaDailyBar[] {
  const series = data["Time Series (Daily)"] ?? {};

  return Object.entries(series)
    .slice(0, limit)
    .map(([date, row]) => ({
      date,
      open: readNumber(row["1. open"]),
      high: readNumber(row["2. high"]),
      low: readNumber(row["3. low"]),
      close: readNumber(row["4. close"]),
      adjustedClose: readNumber(row["5. adjusted close"], readNumber(row["4. close"])),
      volume: readNumber(row["6. volume"] ?? row["5. volume"]),
      dividendAmount: readNumber(row["7. dividend amount"], 0),
      splitCoefficient: readNumber(row["8. split coefficient"], 1),
    }))
    .reverse()
    .filter((bar) => bar.close > 0);
}

export async function getAlphaDailyBars(symbol: string): Promise<AlphaDailyBar[]> {
  const apiKey = getServerEnv().alphaVantageApiKey;
  const normalizedSymbol = symbol.toUpperCase();
  if (!apiKey) return normalizeDailyBars(getFixtureStockData(normalizedSymbol).historical);

  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY_ADJUSTED",
    symbol: normalizedSymbol,
    outputsize: "compact",
    apikey: apiKey,
  });

  const { data } = await cachedProviderRequest<DailyResponse>({
    provider: "alphaVantage",
    endpoint: "TIME_SERIES_DAILY_ADJUSTED",
    params: { symbol: normalizedSymbol },
    ttlMs: 24 * 60 * 60 * 1_000,
    fetcher: () => fetchProviderJson("alphaVantage", `${BASE_URL}?${params}`),
  });

  const bars = parseAlphaDailyBars(data, 100);

  return bars.length > 0 ? bars : normalizeDailyBars(getFixtureStockData(normalizedSymbol).historical);
}
