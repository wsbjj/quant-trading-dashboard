import type { ProviderName, ProviderStatus } from "../types";

export type ApiKeyStatus = {
  finnhub: boolean;
  alphaVantage: boolean;
  openFda: boolean;
  secUserAgent: boolean;
  llm: boolean;
};

export type ProviderStatusInput = {
  keyStatus: ApiKeyStatus;
  outcomes: Partial<Record<ProviderName, ProviderStatus | undefined>>;
};

export function buildProviderStatuses(input: ProviderStatusInput): Record<ProviderName, ProviderStatus> {
  const initial: Record<ProviderName, ProviderStatus> = {
    finnhub: input.keyStatus.finnhub ? "ok" : "missing_key",
    alphaVantage: input.keyStatus.alphaVantage ? "ok" : "missing_key",
    sec: input.keyStatus.secUserAgent ? "ok" : "missing_key",
    openFda: "ok",
    clinicalTrials: "ok",
  };

  const statuses = { ...initial };
  for (const [provider, status] of Object.entries(input.outcomes) as Array<[ProviderName, ProviderStatus | undefined]>) {
    if (status !== undefined) statuses[provider] = status;
  }
  return statuses;
}
