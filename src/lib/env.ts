import type { ApiLimitInfo } from "./types";

export const API_LIMITS: ApiLimitInfo[] = [
  {
    provider: "finnhub",
    label: "Finnhub",
    requiresKey: true,
    officialLimit: "Free: 60 API calls/minute",
    appDefaultLimit: "监控 30 秒/批次；盘中采集建议 60 秒/批次，最多 50 只监控股票",
    sourceUrl: "https://finnhub.io/pricing",
  },
  {
    provider: "alphaVantage",
    label: "Alpha Vantage",
    requiresKey: true,
    officialLimit: "Standard free usage: 25 API requests/day",
    appDefaultLimit: "日线采集默认每天最多 25 只监控股票",
    sourceUrl: "https://www.alphavantage.co/support/",
  },
  {
    provider: "sec",
    label: "SEC EDGAR",
    requiresKey: false,
    officialLimit: "No API key; fair access maximum 10 requests/second with User-Agent",
    appDefaultLimit: "事件采集建议每 6-24 小时同步",
    sourceUrl: "https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data",
  },
  {
    provider: "openFda",
    label: "openFDA",
    requiresKey: false,
    officialLimit: "No key: 240/min + 1,000/day; key: 240/min + 120,000/day",
    appDefaultLimit: "事件采集建议每 6-24 小时同步",
    sourceUrl: "https://open.fda.gov/apis/authentication/",
  },
  {
    provider: "clinicalTrials",
    label: "ClinicalTrials.gov",
    requiresKey: false,
    officialLimit: "No API key; no public numeric hard limit found in API docs",
    appDefaultLimit: "事件采集建议每 6-24 小时同步",
    sourceUrl: "https://clinicaltrials.gov/data-api/api",
  },
];

export function getServerEnv() {
  return {
    finnhubApiKey: process.env.FINNHUB_API_KEY?.trim() ?? "",
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY?.trim() ?? "",
    openFdaApiKey: process.env.OPENFDA_API_KEY?.trim() ?? "",
    secUserAgent: process.env.SEC_USER_AGENT?.trim() ?? "",
    llmApiKey: process.env.LLM_API_KEY?.trim() ?? "",
    llmBaseUrl: process.env.LLM_BASE_URL?.trim() ?? "",
    llmModel: process.env.LLM_MODEL?.trim() ?? "",
    ingestCronSecret: process.env.INGEST_CRON_SECRET?.trim() ?? "",
  };
}

export function getApiKeyStatus() {
  const env = getServerEnv();
  return {
    finnhub: Boolean(env.finnhubApiKey),
    alphaVantage: Boolean(env.alphaVantageApiKey),
    openFda: Boolean(env.openFdaApiKey),
    secUserAgent: Boolean(env.secUserAgent && !env.secUserAgent.includes("your-email")),
    llm: Boolean(env.llmApiKey && env.llmBaseUrl && env.llmModel),
  };
}
