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
  adjustedClose?: number | null;
  volume: number;
  dividendAmount?: number | null;
  splitCoefficient?: number | null;
};

export type AlphaDailyBar = HistoricalBar & {
  adjustedClose: number | null;
  dividendAmount: number | null;
  splitCoefficient: number | null;
};

export type IngestionJobType = "intraday" | "daily" | "events";

export type IngestionJobStatus = "running" | "success" | "failed";

export type IngestionSummary = {
  jobId: string;
  jobType: IngestionJobType;
  status: IngestionJobStatus;
  trigger: string;
  symbols: string[];
  symbolCount: number;
  requestCount: number;
  insertedCount: number;
  updatedCount: number;
  errorMessage?: string | null;
};

export type IngestionStatusPayload = {
  counts: {
    dailyBars: number;
    intradaySnapshots: number;
    catalysts: number;
  };
  lastSuccessfulAt: Record<IngestionJobType, string | null>;
  recentJobs: Array<{
    id: string;
    jobType: string;
    status: string;
    trigger: string | null;
    startedAt: string;
    finishedAt: string | null;
    symbolCount: number;
    requestCount: number;
    insertedCount: number;
    updatedCount: number;
    errorMessage: string | null;
  }>;
  recentError: {
    jobType: string;
    errorMessage: string | null;
    finishedAt: string | null;
  } | null;
};

export type DataOverviewPayload = {
  counts: {
    dailyBars: number;
    intradaySnapshots: number;
    catalysts: number;
    ingestionJobs: number;
  };
  symbols: Array<{
    symbol: string;
    name: string | null;
    exchange?: string | null;
    industry?: string | null;
    dailyBars: number;
    intradaySnapshots: number;
    catalysts: number;
    lastDailyDate: string | null;
    lastSnapshotAt: string | null;
    lastEventDate: string | null;
  }>;
  recentJobs: IngestionStatusPayload["recentJobs"];
};

export type LlmTradePlanAnalysis = {
  trend: string;
  supportResistance: string[];
  volumeObservation: string;
  catalystImpact: string;
  scenarios: {
    bullish: string[];
    neutral: string[];
    bearish: string[];
  };
  invalidation: string[];
  risks: string[];
  dataGaps: string[];
  disclaimer: string;
};

export type LlmAnalysisRecordPayload = {
  id: string;
  symbol: string;
  model: string;
  promptVersion: string;
  status: string;
  inputSummary: string;
  analysis: LlmTradePlanAnalysis | null;
  rawResponse: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type SymbolDataPayload = {
  symbol: string;
  stock: {
    symbol: string;
    name: string;
    exchange?: string | null;
    industry?: string | null;
  } | null;
  dailyBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjustedClose: number | null;
    volume: number;
    dividendAmount: number | null;
    splitCoefficient: number | null;
    source: string;
  }>;
  intradaySnapshots: Array<{
    asOf: string;
    currentPrice: number;
    change: number;
    percentChange: number;
    open: number;
    high: number;
    low: number;
    previousClose: number;
    volume: number;
    source: string;
  }>;
  catalysts: Array<{
    id: string;
    category: string;
    title: string;
    summary: string | null;
    eventDate: string;
    url: string | null;
    source: string;
    sentimentHint: string | null;
  }>;
  analyses: LlmAnalysisRecordPayload[];
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
