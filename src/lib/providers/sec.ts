import { getServerEnv } from "../env";
import type { CatalystEvent } from "../types";
import { fetchProviderJson } from "./http";
import { cachedProviderRequest } from "./requestCache";

const SEC_HEADERS = () => {
  const userAgent = getServerEnv().secUserAgent || "quant-trading-dashboard local-development";
  return { "User-Agent": userAgent };
};

type SecCompanyTicker = {
  cik_str: number;
  ticker: string;
  title: string;
};

export async function getSecFilings(symbol: string): Promise<CatalystEvent[]> {
  const normalizedSymbol = symbol.toUpperCase();

  try {
    const { data: tickers } = await cachedProviderRequest<Record<string, SecCompanyTicker>>({
      provider: "sec",
      endpoint: "/files/company_tickers.json",
      params: {},
      ttlMs: 24 * 60 * 60 * 1_000,
      fetcher: () =>
        fetchProviderJson("sec", "https://www.sec.gov/files/company_tickers.json", {
          headers: SEC_HEADERS(),
        }),
    });

    const match = Object.values(tickers).find((item) => item.ticker?.toUpperCase() === normalizedSymbol);
    if (!match) return [];

    const cik = String(match.cik_str).padStart(10, "0");
    type Submission = {
      filings?: { recent?: { accessionNumber?: string[]; form?: string[]; filingDate?: string[]; primaryDocument?: string[] } };
    };

    const { data: submission } = await cachedProviderRequest<Submission>({
      provider: "sec",
      endpoint: "/submissions",
      params: { cik },
      ttlMs: 6 * 60 * 60 * 1_000,
      fetcher: () =>
        fetchProviderJson("sec", `https://data.sec.gov/submissions/CIK${cik}.json`, {
          headers: SEC_HEADERS(),
        }),
    });

    const recent = submission.filings?.recent;
    if (!recent?.accessionNumber) return [];

    return recent.accessionNumber.slice(0, 6).map((accession, index) => {
      const noDash = accession.replace(/-/g, "");
      const document = recent.primaryDocument?.[index] ?? "";
      return {
        id: `sec-${accession}`,
        symbol: normalizedSymbol,
        title: `SEC ${recent.form?.[index] ?? "filing"} filed`,
        summary: `Accession ${accession}`,
        category: "sec",
        date: recent.filingDate?.[index] ?? new Date().toISOString(),
        url: document
          ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${noDash}/${document}`
          : `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}`,
        source: "sec",
        sentimentHint: /S-1|424B|POS/i.test(recent.form?.[index] ?? "") ? "bearish" : "neutral",
      };
    });
  } catch {
    return [];
  }
}
