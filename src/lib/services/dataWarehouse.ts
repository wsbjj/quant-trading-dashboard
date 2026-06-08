import { getServerEnv } from "../env";
import { prisma } from "../prisma";
import type { DataOverviewPayload, LlmAnalysisRecordPayload, LlmTradePlanAnalysis, SymbolDataPayload } from "../types";

const PROMPT_VERSION = "trade-plan-v1";

type DateLike = Date | null;

type CountGroup<T extends string> = {
  symbol: string;
  _count: { _all: number };
  _max: Record<T, DateLike>;
};

type JobRecord = {
  id: string;
  jobType: string;
  status: string;
  trigger: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  symbolCount: number;
  requestCount: number;
  insertedCount: number;
  updatedCount: number;
  errorMessage: string | null;
};

type LlmRecord = {
  id: string;
  symbol: string;
  model: string;
  promptVersion: string;
  inputSummary: string;
  analysisJson: string | null;
  rawResponse: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

export class LlmConfigurationError extends Error {}

export class LlmProviderError extends Error {}

function iso(value: DateLike) {
  return value ? value.toISOString() : null;
}

function serializeJob(job: JobRecord) {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    trigger: job.trigger,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
    symbolCount: job.symbolCount,
    requestCount: job.requestCount,
    insertedCount: job.insertedCount,
    updatedCount: job.updatedCount,
    errorMessage: job.errorMessage,
  };
}

function parseAnalysisJson(value: string | null): LlmTradePlanAnalysis | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as LlmTradePlanAnalysis;
  } catch {
    return null;
  }
}

function serializeAnalysis(record: LlmRecord): LlmAnalysisRecordPayload {
  return {
    id: record.id,
    symbol: record.symbol,
    model: record.model,
    promptVersion: record.promptVersion,
    status: record.status,
    inputSummary: record.inputSummary,
    analysis: parseAnalysisJson(record.analysisJson),
    rawResponse: record.rawResponse,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
  };
}

function addGroup<T extends string>(
  target: Map<string, DataOverviewPayload["symbols"][number]>,
  groups: CountGroup<T>[],
  countKey: "dailyBars" | "intradaySnapshots" | "catalysts",
  dateKey: "lastDailyDate" | "lastSnapshotAt" | "lastEventDate",
  maxKey: T,
) {
  for (const group of groups) {
    const symbol = group.symbol.toUpperCase();
    const existing =
      target.get(symbol) ??
      ({
        symbol,
        name: null,
        dailyBars: 0,
        intradaySnapshots: 0,
        catalysts: 0,
        lastDailyDate: null,
        lastSnapshotAt: null,
        lastEventDate: null,
      } satisfies DataOverviewPayload["symbols"][number]);

    existing[countKey] = group._count._all;
    existing[dateKey] = iso(group._max[maxKey]);
    target.set(symbol, existing);
  }
}

export async function getDataOverview(): Promise<DataOverviewPayload> {
  const [
    dailyBars,
    intradaySnapshots,
    catalysts,
    ingestionJobs,
    dailyGroups,
    snapshotGroups,
    catalystGroups,
    recentJobs,
  ] = await Promise.all([
    prisma.dailyBar.count(),
    prisma.intradaySnapshot.count(),
    prisma.catalystRecord.count(),
    prisma.dataIngestionJob.count(),
    prisma.dailyBar.groupBy({
      by: ["symbol"],
      _count: { _all: true },
      _max: { date: true },
    }),
    prisma.intradaySnapshot.groupBy({
      by: ["symbol"],
      _count: { _all: true },
      _max: { asOf: true },
    }),
    prisma.catalystRecord.groupBy({
      by: ["symbol"],
      _count: { _all: true },
      _max: { eventDate: true },
    }),
    prisma.dataIngestionJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);

  const coverage = new Map<string, DataOverviewPayload["symbols"][number]>();
  addGroup(coverage, dailyGroups, "dailyBars", "lastDailyDate", "date");
  addGroup(coverage, snapshotGroups, "intradaySnapshots", "lastSnapshotAt", "asOf");
  addGroup(coverage, catalystGroups, "catalysts", "lastEventDate", "eventDate");

  const symbols = Array.from(coverage.keys());
  const stocks = await prisma.stock.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, name: true, exchange: true, industry: true },
  });
  const stockBySymbol = new Map(stocks.map((stock) => [stock.symbol.toUpperCase(), stock]));

  return {
    counts: {
      dailyBars,
      intradaySnapshots,
      catalysts,
      ingestionJobs,
    },
    symbols: Array.from(coverage.values())
      .map((item) => {
        const stock = stockBySymbol.get(item.symbol);
        return {
          ...item,
          name: stock?.name ?? item.name,
          exchange: stock?.exchange ?? null,
          industry: stock?.industry ?? null,
        };
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    recentJobs: recentJobs.map(serializeJob),
  };
}

export async function getSymbolData(symbol: string): Promise<SymbolDataPayload> {
  const normalizedSymbol = symbol.toUpperCase();
  const [stock, dailyRows, snapshotRows, catalysts, analyses] = await Promise.all([
    prisma.stock.findUnique({
      where: { symbol: normalizedSymbol },
      select: { symbol: true, name: true, exchange: true, industry: true },
    }),
    prisma.dailyBar.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.intradaySnapshot.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { asOf: "desc" },
      take: 200,
    }),
    prisma.catalystRecord.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { eventDate: "desc" },
      take: 50,
    }),
    prisma.llmAnalysisRecord.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    symbol: normalizedSymbol,
    stock: stock
      ? {
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.exchange,
          industry: stock.industry,
        }
      : null,
    dailyBars: dailyRows
      .slice()
      .reverse()
      .map((bar) => ({
        date: bar.date.toISOString(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        adjustedClose: bar.adjustedClose,
        volume: bar.volume,
        dividendAmount: bar.dividendAmount,
        splitCoefficient: bar.splitCoefficient,
        source: bar.source,
      })),
    intradaySnapshots: snapshotRows.map((snapshot) => ({
      asOf: snapshot.asOf.toISOString(),
      currentPrice: snapshot.currentPrice,
      change: snapshot.change,
      percentChange: snapshot.percentChange,
      open: snapshot.open,
      high: snapshot.high,
      low: snapshot.low,
      previousClose: snapshot.previousClose,
      volume: snapshot.volume,
      source: snapshot.source,
    })),
    catalysts: catalysts.map((event) => ({
      id: event.id,
      category: event.category,
      title: event.title,
      summary: event.summary,
      eventDate: event.eventDate.toISOString(),
      url: event.url,
      source: event.source,
      sentimentHint: event.sentimentHint,
    })),
    analyses: analyses.map(serializeAnalysis),
  };
}

function summarizeInput(data: SymbolDataPayload) {
  return {
    symbol: data.symbol,
    dailyBars: {
      count: data.dailyBars.length,
      from: data.dailyBars[0]?.date ?? null,
      to: data.dailyBars.at(-1)?.date ?? null,
    },
    intradaySnapshots: {
      count: data.intradaySnapshots.length,
      latest: data.intradaySnapshots[0]?.asOf ?? null,
    },
    catalysts: {
      count: data.catalysts.length,
      latest: data.catalysts[0]?.eventDate ?? null,
    },
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function extractMessageContent(response: unknown) {
  const choices = (response as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function stripJsonFence(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function buildPrompt(data: SymbolDataPayload, inputSummary: unknown) {
  return [
    {
      role: "system",
      content:
        "你是量化研究助手。请基于用户提供的已采集历史数据，输出中文交易计划草案。只做教育用途情景推演，不要给出必须买入或卖出的直接指令。必须返回严格 JSON，不要 Markdown。",
    },
    {
      role: "user",
      content: JSON.stringify({
        requiredJsonShape: {
          trend: "字符串：趋势判断",
          supportResistance: ["字符串数组：关键支撑压力"],
          volumeObservation: "字符串：成交量观察",
          catalystImpact: "字符串：事件影响",
          scenarios: {
            bullish: ["字符串数组：偏多情景"],
            neutral: ["字符串数组：中性情景"],
            bearish: ["字符串数组：偏空情景"],
          },
          invalidation: ["字符串数组：计划失效条件"],
          risks: ["字符串数组：风险提示"],
          dataGaps: ["字符串数组：数据缺口"],
          disclaimer: "字符串：仅教育用途，不构成投资建议",
        },
        inputSummary,
        data: {
          stock: data.stock,
          dailyBars: data.dailyBars,
          intradaySnapshots: data.intradaySnapshots,
          catalysts: data.catalysts,
        },
      }),
    },
  ];
}

export async function runSymbolLlmAnalysis(symbol: string): Promise<LlmAnalysisRecordPayload> {
  const env = getServerEnv();
  if (!env.llmApiKey || !env.llmBaseUrl || !env.llmModel) {
    throw new LlmConfigurationError("LLM is not configured. Set LLM_API_KEY, LLM_BASE_URL and LLM_MODEL.");
  }

  const data = await getSymbolData(symbol);
  if (!data.stock) {
    throw new LlmProviderError(`No collected data found for ${data.symbol}.`);
  }

  const inputSummary = summarizeInput(data);
  const inputSummaryJson = JSON.stringify(inputSummary);
  const endpoint = `${normalizeBaseUrl(env.llmBaseUrl)}/chat/completions`;
  let rawResponse: string | null = null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.llmModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: buildPrompt(data, inputSummary),
      }),
    });

    const responseJson = (await response.json()) as unknown;
    rawResponse = JSON.stringify(responseJson);

    if (!response.ok) {
      throw new LlmProviderError(`LLM provider returned HTTP ${response.status}`);
    }

    const content = extractMessageContent(responseJson);
    if (!content) throw new LlmProviderError("LLM provider did not return message content.");

    const analysis = JSON.parse(stripJsonFence(content)) as LlmTradePlanAnalysis;
    const saved = await prisma.llmAnalysisRecord.create({
      data: {
        symbol: data.symbol,
        model: env.llmModel,
        promptVersion: PROMPT_VERSION,
        inputSummary: inputSummaryJson,
        analysisJson: JSON.stringify(analysis),
        rawResponse,
        status: "success",
        errorMessage: null,
      },
    });

    return serializeAnalysis(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM provider failure";
    await prisma.llmAnalysisRecord.create({
      data: {
        symbol: data.symbol,
        model: env.llmModel,
        promptVersion: PROMPT_VERSION,
        inputSummary: inputSummaryJson,
        analysisJson: null,
        rawResponse,
        status: "failed",
        errorMessage: message.includes("JSON") ? "LLM response was not valid JSON." : message,
      },
    });
    throw new LlmProviderError(message.includes("JSON") ? "LLM response was not valid JSON." : message);
  }
}
