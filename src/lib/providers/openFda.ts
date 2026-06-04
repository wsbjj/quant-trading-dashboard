import { getServerEnv } from "../env";
import type { CatalystEvent } from "../types";
import { fetchProviderJson } from "./http";
import { cachedProviderRequest } from "./requestCache";

const BASE_URL = "https://api.fda.gov";

function paramsWithOptionalKey(params: Record<string, string>) {
  const apiKey = getServerEnv().openFdaApiKey;
  return new URLSearchParams(apiKey ? { api_key: apiKey, ...params } : params);
}

export async function getOpenFdaCatalysts(symbol: string, companyName: string): Promise<CatalystEvent[]> {
  const queryName = companyName.replace(/,?\s+inc\.?$/i, "").trim();
  const search = `openfda.manufacturer_name:"${queryName}"`;

  try {
    type EnforcementResponse = {
      results?: Array<{ recall_initiation_date?: string; reason_for_recall?: string; status?: string; recalling_firm?: string }>;
    };

    const { data } = await cachedProviderRequest<EnforcementResponse>({
      provider: "openFda",
      endpoint: "/drug/enforcement.json",
      params: { search, limit: 5 },
      ttlMs: 6 * 60 * 60 * 1_000,
      fetcher: () =>
        fetchProviderJson("openFda", `${BASE_URL}/drug/enforcement.json?${paramsWithOptionalKey({ search, limit: "5" })}`),
    });

    return (data.results ?? []).slice(0, 5).map((item, index) => ({
      id: `openfda-${symbol}-${index}-${item.recall_initiation_date ?? "unknown"}`,
      symbol: symbol.toUpperCase(),
      title: `FDA enforcement record: ${item.recalling_firm ?? queryName}`,
      summary: item.reason_for_recall ?? item.status ?? null,
      category: "fda",
      date: item.recall_initiation_date
        ? `${item.recall_initiation_date.slice(0, 4)}-${item.recall_initiation_date.slice(4, 6)}-${item.recall_initiation_date.slice(6, 8)}`
        : new Date().toISOString(),
      url: "https://open.fda.gov/apis/drug/enforcement/",
      source: "openFda",
      sentimentHint: "bearish",
    }));
  } catch {
    return [];
  }
}
