import { getServerEnv } from "../env";
import { getFixtureStockData, sampleSearchResults } from "../fixtures/sampleStockData";
import type { CatalystEvent, CompanyProfile, NormalizedQuote, SymbolSearchResult } from "../types";
import { cachedProviderRequest } from "./requestCache";
import { fetchProviderJson } from "./http";

const BASE_URL = "https://finnhub.io/api/v1";
const SHORT_TTL_MS = 30_000;
const LONG_TTL_MS = 6 * 60 * 60 * 1_000;

function withToken(params: Record<string, string>) {
  const token = getServerEnv().finnhubApiKey;
  return new URLSearchParams({ ...params, token });
}

function hasFinnhubKey() {
  return Boolean(getServerEnv().finnhubApiKey);
}

export async function searchFinnhubSymbols(query: string): Promise<SymbolSearchResult[]> {
  const normalizedQuery = query.trim().toUpperCase();
  if (!hasFinnhubKey()) {
    return sampleSearchResults.filter(
      (item) => item.symbol.includes(normalizedQuery) || item.name.toUpperCase().includes(normalizedQuery),
    );
  }

  type FinnhubSearchResponse = {
    result?: Array<{ symbol?: string; description?: string; displaySymbol?: string; type?: string }>;
  };

  const { data } = await cachedProviderRequest<FinnhubSearchResponse>({
    provider: "finnhub",
    endpoint: "/search",
    params: { q: normalizedQuery },
    ttlMs: LONG_TTL_MS,
    fetcher: () => fetchProviderJson("finnhub", `${BASE_URL}/search?${withToken({ q: normalizedQuery })}`),
  });

  return (data.result ?? [])
    .filter((item) => item.symbol)
    .slice(0, 12)
    .map((item) => ({
      symbol: item.displaySymbol ?? item.symbol ?? "",
      name: item.description ?? item.symbol ?? "",
      type: item.type,
      source: "finnhub",
    }));
}

export async function getFinnhubQuote(symbol: string, fallbackVolume?: number): Promise<NormalizedQuote> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!hasFinnhubKey()) {
    return getFixtureStockData(normalizedSymbol).quote;
  }

  type FinnhubQuote = { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number; t?: number };
  const { data } = await cachedProviderRequest<FinnhubQuote>({
    provider: "finnhub",
    endpoint: "/quote",
    params: { symbol: normalizedSymbol },
    ttlMs: SHORT_TTL_MS,
    fetcher: () => fetchProviderJson("finnhub", `${BASE_URL}/quote?${withToken({ symbol: normalizedSymbol })}`),
  });

  if (!data.c) return getFixtureStockData(normalizedSymbol).quote;

  return {
    symbol: normalizedSymbol,
    currentPrice: data.c,
    change: data.d ?? data.c - (data.pc ?? data.c),
    percentChange: data.dp ?? 0,
    open: data.o ?? data.c,
    high: data.h ?? data.c,
    low: data.l ?? data.c,
    previousClose: data.pc ?? data.c,
    volume: fallbackVolume ?? 0,
    afterHoursPrice: null,
    marketState: "unknown",
    asOf: data.t ? new Date(data.t * 1_000).toISOString() : new Date().toISOString(),
    source: "finnhub",
  };
}

export async function getFinnhubProfile(symbol: string): Promise<CompanyProfile> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!hasFinnhubKey()) {
    return getFixtureStockData(normalizedSymbol).profile;
  }

  type FinnhubProfile = {
    name?: string;
    finnhubIndustry?: string;
    exchange?: string;
    marketCapitalization?: number;
    shareOutstanding?: number;
    country?: string;
    weburl?: string;
  };

  const { data } = await cachedProviderRequest<FinnhubProfile>({
    provider: "finnhub",
    endpoint: "/stock/profile2",
    params: { symbol: normalizedSymbol },
    ttlMs: LONG_TTL_MS,
    fetcher: () => fetchProviderJson("finnhub", `${BASE_URL}/stock/profile2?${withToken({ symbol: normalizedSymbol })}`),
  });

  const fixture = getFixtureStockData(normalizedSymbol).profile;
  return {
    symbol: normalizedSymbol,
    name: data.name ?? fixture.name,
    industry: data.finnhubIndustry ?? fixture.industry,
    exchange: data.exchange ?? fixture.exchange,
    marketCap: data.marketCapitalization ? data.marketCapitalization * 1_000_000 : fixture.marketCap,
    shareOutstanding: data.shareOutstanding ? data.shareOutstanding * 1_000_000 : fixture.shareOutstanding,
    freeFloat: data.shareOutstanding ? data.shareOutstanding * 1_000_000 : fixture.freeFloat,
    country: data.country ?? fixture.country,
    website: data.weburl ?? fixture.website,
    source: "finnhub",
  };
}

export async function getFinnhubCompanyNews(symbol: string): Promise<CatalystEvent[]> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!hasFinnhubKey()) {
    return getFixtureStockData(normalizedSymbol).catalysts.filter((event) => event.category === "news");
  }

  const to = new Date();
  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1_000);
  const toDate = to.toISOString().slice(0, 10);
  const fromDate = from.toISOString().slice(0, 10);

  type FinnhubNews = Array<{
    id?: number;
    headline?: string;
    summary?: string;
    datetime?: number;
    url?: string;
  }>;

  const { data } = await cachedProviderRequest<FinnhubNews>({
    provider: "finnhub",
    endpoint: "/company-news",
    params: { symbol: normalizedSymbol, from: fromDate, to: toDate },
    ttlMs: 15 * 60 * 1_000,
    fetcher: () =>
      fetchProviderJson(
        "finnhub",
        `${BASE_URL}/company-news?${withToken({ symbol: normalizedSymbol, from: fromDate, to: toDate })}`,
      ),
  });

  return data.slice(0, 8).map((item, index) => ({
    id: `finnhub-news-${item.id ?? `${normalizedSymbol}-${index}`}`,
    symbol: normalizedSymbol,
    title: item.headline ?? "Untitled company news",
    summary: item.summary ?? null,
    category: "news",
    date: item.datetime ? new Date(item.datetime * 1_000).toISOString() : new Date().toISOString(),
    url: item.url ?? null,
    source: "finnhub",
    sentimentHint: /trial|fda|approval|present|positive|contract|earnings beat/i.test(`${item.headline} ${item.summary}`)
      ? "bullish"
      : /offering|dilution|investigation|halt|warning|lawsuit/i.test(`${item.headline} ${item.summary}`)
        ? "bearish"
        : "neutral",
  }));
}

export async function getFinnhubFilings(symbol: string): Promise<CatalystEvent[]> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!hasFinnhubKey()) return [];

  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);

  type FinnhubFilings = Array<{ accessNumber?: string; form?: string; filedDate?: string; reportUrl?: string }>;

  const { data } = await cachedProviderRequest<FinnhubFilings>({
    provider: "finnhub",
    endpoint: "/stock/filings",
    params: { symbol: normalizedSymbol, from: fromDate, to: toDate },
    ttlMs: LONG_TTL_MS,
    fetcher: () =>
      fetchProviderJson(
        "finnhub",
        `${BASE_URL}/stock/filings?${withToken({ symbol: normalizedSymbol, from: fromDate, to: toDate })}`,
      ),
  });

  return data.slice(0, 5).map((item, index) => ({
    id: `finnhub-filing-${item.accessNumber ?? `${normalizedSymbol}-${index}`}`,
    symbol: normalizedSymbol,
    title: `SEC filing ${item.form ?? "document"} posted via Finnhub`,
    summary: item.accessNumber ?? null,
    category: "sec",
    date: item.filedDate ?? new Date().toISOString(),
    url: item.reportUrl ?? null,
    source: "finnhub",
    sentimentHint: /S-1|424B|8-K/i.test(item.form ?? "") ? "neutral" : "neutral",
  }));
}
