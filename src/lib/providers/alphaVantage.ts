import { getServerEnv } from "../env";
import { getFixtureStockData } from "../fixtures/sampleStockData";
import type { HistoricalBar } from "../types";
import { fetchProviderJson } from "./http";
import { cachedProviderRequest } from "./requestCache";

const BASE_URL = "https://www.alphavantage.co/query";

export async function getAlphaDailyBars(symbol: string): Promise<HistoricalBar[]> {
  const apiKey = getServerEnv().alphaVantageApiKey;
  const normalizedSymbol = symbol.toUpperCase();
  if (!apiKey) return getFixtureStockData(normalizedSymbol).historical;

  type DailyResponse = Record<string, Record<string, string>> & {
    "Time Series (Daily)"?: Record<string, Record<string, string>>;
  };

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

  const series = data["Time Series (Daily)"] ?? {};
  const bars = Object.entries(series)
    .slice(0, 30)
    .map(([date, row]) => ({
      date,
      open: Number(row["1. open"] ?? 0),
      high: Number(row["2. high"] ?? 0),
      low: Number(row["3. low"] ?? 0),
      close: Number(row["4. close"] ?? 0),
      volume: Number(row["6. volume"] ?? row["5. volume"] ?? 0),
    }))
    .reverse()
    .filter((bar) => bar.close > 0);

  return bars.length > 0 ? bars : getFixtureStockData(normalizedSymbol).historical;
}
