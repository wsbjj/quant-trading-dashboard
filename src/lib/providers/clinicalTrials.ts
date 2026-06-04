import type { CatalystEvent } from "../types";
import { fetchProviderJson } from "./http";
import { cachedProviderRequest } from "./requestCache";

export async function getClinicalTrialCatalysts(symbol: string, companyName: string): Promise<CatalystEvent[]> {
  const term = companyName.replace(/,?\s+inc\.?$/i, "").trim();

  try {
    type TrialsResponse = {
      studies?: Array<{
        protocolSection?: {
          identificationModule?: { nctId?: string; briefTitle?: string; officialTitle?: string };
          statusModule?: { overallStatus?: string; startDateStruct?: { date?: string }; completionDateStruct?: { date?: string } };
          designModule?: { phases?: string[] };
          sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
        };
      }>;
    };

    const params = new URLSearchParams({ "query.term": term, format: "json", pageSize: "5" });
    const { data } = await cachedProviderRequest<TrialsResponse>({
      provider: "clinicalTrials",
      endpoint: "/api/v2/studies",
      params: { term, pageSize: 5 },
      ttlMs: 6 * 60 * 60 * 1_000,
      fetcher: () => fetchProviderJson("clinicalTrials", `https://clinicaltrials.gov/api/v2/studies?${params}`),
    });

    return (data.studies ?? []).slice(0, 5).map((study, index) => {
      const protocol = study.protocolSection;
      const nctId = protocol?.identificationModule?.nctId ?? `${symbol}-${index}`;
      const phase = protocol?.designModule?.phases?.join(", ") ?? "Phase not specified";
      return {
        id: `clinical-${nctId}`,
        symbol: symbol.toUpperCase(),
        title: protocol?.identificationModule?.briefTitle ?? protocol?.identificationModule?.officialTitle ?? "Clinical trial update",
        summary: `${phase}; status: ${protocol?.statusModule?.overallStatus ?? "unknown"}; sponsor: ${
          protocol?.sponsorCollaboratorsModule?.leadSponsor?.name ?? "unknown"
        }`,
        category: "clinical_trial",
        date:
          protocol?.statusModule?.completionDateStruct?.date ??
          protocol?.statusModule?.startDateStruct?.date ??
          new Date().toISOString(),
        url: `https://clinicaltrials.gov/study/${nctId}`,
        source: "clinicalTrials",
        sentimentHint: /RECRUITING|ACTIVE|COMPLETED/i.test(protocol?.statusModule?.overallStatus ?? "") ? "bullish" : "neutral",
      };
    });
  } catch {
    return [];
  }
}
