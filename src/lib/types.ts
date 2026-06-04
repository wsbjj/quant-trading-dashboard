export type ProviderName =
  | "finnhub"
  | "alphaVantage"
  | "sec"
  | "openFda"
  | "clinicalTrials";

export type ProviderStatus = "ok" | "missing_key" | "rate_limited" | "error" | "cached";

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  source: ProviderName | "fixture";
};

export type NormalizedQuote = {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  afterHoursPrice?: number | null;
  marketState: "open" | "closed" | "unknown";
  asOf: string;
  source: ProviderName | "fixture";
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  industry?: string | null;
  exchange?: string | null;
  marketCap?: number | null;
  shareOutstanding?: number | null;
  freeFloat?: number | null;
  country?: string | null;
  website?: string | null;
  source: ProviderName | "fixture";
};

export type CatalystEvent = {
  id: string;
  symbol: string;
  title: string;
  summary?: string | null;
  category: "news" | "sec" | "fda" | "clinical_trial";
  date: string;
  url?: string | null;
  source: ProviderName | "fixture";
  sentimentHint?: "bullish" | "neutral" | "bearish";
};

export type HistoricalBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type NormalizedStockData = {
  symbol: string;
  quote: NormalizedQuote;
  profile: CompanyProfile;
  catalysts: CatalystEvent[];
  historical: HistoricalBar[];
  shortInterest?: {
    shortInterestPercent?: number | null;
    daysToCover?: number | null;
    costToBorrow?: number | null;
    source?: string | null;
  };
  providerStatuses: Record<string, ProviderStatus>;
};

export type ApiLimitInfo = {
  provider: ProviderName;
  label: string;
  requiresKey: boolean;
  officialLimit: string;
  appDefaultLimit: string;
  sourceUrl: string;
};
