import type { NormalizedStockData, SymbolSearchResult } from "../types";

export const sampleSearchResults: SymbolSearchResult[] = [
  {
    symbol: "AIM",
    name: "AIM ImmunoTech Inc.",
    exchange: "NYSE American",
    type: "Common Stock",
    source: "fixture",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    type: "Common Stock",
    source: "fixture",
  },
  {
    symbol: "MRNA",
    name: "Moderna, Inc.",
    exchange: "NASDAQ",
    type: "Common Stock",
    source: "fixture",
  },
  {
    symbol: "NVAX",
    name: "Novavax, Inc.",
    exchange: "NASDAQ",
    type: "Common Stock",
    source: "fixture",
  },
];

export const sampleNormalizedStockData: NormalizedStockData = {
  symbol: "AIM",
  quote: {
    symbol: "AIM",
    currentPrice: 0.729,
    change: -0.0947,
    percentChange: -11.46,
    open: 0.7477,
    high: 0.7881,
    low: 0.665,
    previousClose: 0.8267,
    volume: 8_560_000,
    afterHoursPrice: null,
    marketState: "closed",
    asOf: "2026-06-04T20:00:00.000Z",
    source: "fixture",
  },
  profile: {
    symbol: "AIM",
    name: "AIM ImmunoTech Inc.",
    industry: "Biotech / Immunotherapy",
    exchange: "NYSE American",
    marketCap: 17_590_000,
    shareOutstanding: 24_020_000,
    freeFloat: 23_870_000,
    country: "US",
    website: "https://aimimmuno.com",
    source: "fixture",
  },
  catalysts: [
    {
      id: "fixture-news-aim-ebola",
      symbol: "AIM",
      title: "AIM ImmunoTech to Present Preclinical Findings on Ampligen's Potential as an Early Treatment for Ebola",
      summary:
        "Upcoming preclinical presentation could generate attention and sentiment, but dilution history and limited liquidity keep conviction moderate.",
      category: "news",
      date: "2026-06-04",
      url: "https://example.com/aim-catalyst",
      source: "fixture",
      sentimentHint: "bullish",
    },
    {
      id: "fixture-sec-aim-s1",
      symbol: "AIM",
      title: "Recent SEC filing indicates financing and dilution risk remains relevant",
      summary: "Financing history can cap momentum when liquidity is thin.",
      category: "sec",
      date: "2026-06-02",
      url: "https://www.sec.gov/",
      source: "fixture",
      sentimentHint: "bearish",
    },
  ],
  historical: [
    { date: "2026-05-20", open: 0.7, high: 0.76, low: 0.68, close: 0.73, volume: 214_000_000 },
    { date: "2026-05-21", open: 0.73, high: 0.78, low: 0.69, close: 0.74, volume: 203_000_000 },
    { date: "2026-05-22", open: 0.74, high: 0.79, low: 0.7, close: 0.75, volume: 225_000_000 },
  ],
  shortInterest: {
    shortInterestPercent: null,
    daysToCover: null,
    costToBorrow: null,
    source: "No free real-time source configured",
  },
  providerStatuses: {
    finnhub: "missing_key",
    alphaVantage: "missing_key",
    sec: "ok",
    openFda: "ok",
    clinicalTrials: "ok",
  },
};

export function getFixtureStockData(symbol: string): NormalizedStockData {
  if (symbol.toUpperCase() === "AIM") return sampleNormalizedStockData;

  return {
    ...sampleNormalizedStockData,
    symbol: symbol.toUpperCase(),
    quote: {
      ...sampleNormalizedStockData.quote,
      symbol: symbol.toUpperCase(),
      currentPrice: 42.35,
      change: 0.73,
      percentChange: 1.75,
      open: 41.8,
      high: 43.1,
      low: 40.95,
      previousClose: 41.62,
      volume: 1_250_000,
    },
    profile: {
      ...sampleNormalizedStockData.profile,
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Demo Corp.`,
      industry: "Equity / Demo Data",
      marketCap: 420_000_000,
      shareOutstanding: 52_000_000,
      freeFloat: 38_000_000,
    },
    catalysts: sampleNormalizedStockData.catalysts.map((catalyst) => ({
      ...catalyst,
      id: catalyst.id.replace("aim", symbol.toLowerCase()),
      symbol: symbol.toUpperCase(),
    })),
  };
}
