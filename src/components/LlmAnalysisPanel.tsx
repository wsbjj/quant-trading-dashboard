"use client";

import { BrainCircuit, Loader2 } from "lucide-react";
import { useState } from "react";
import type { LlmAnalysisRecordPayload, LlmTradePlanAnalysis } from "@/lib/types";

function TextList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
      {items.length === 0 ? <li className="text-zinc-500">暂无</li> : null}
      {items.map((item) => (
        <li key={item} className="border-l border-zinc-700 pl-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function AnalysisView({ analysis }: { analysis: LlmTradePlanAnalysis }) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500">趋势判断</p>
          <p className="mt-1 text-lg font-bold text-yellow-200">{analysis.trend}</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500">成交量观察</p>
          <p className="mt-1 text-zinc-200">{analysis.volumeObservation}</p>
        </div>
      </div>
      <div className="border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs text-zinc-500">支撑压力</p>
        <TextList items={analysis.supportResistance} />
      </div>
      <div className="border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs text-zinc-500">催化剂影响</p>
        <p className="mt-1 text-zinc-200">{analysis.catalystImpact}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-green-900 bg-green-950/20 p-3">
          <p className="font-bold text-green-300">偏多情景</p>
          <TextList items={analysis.scenarios.bullish} />
        </div>
        <div className="border border-yellow-900 bg-yellow-950/20 p-3">
          <p className="font-bold text-yellow-300">中性情景</p>
          <TextList items={analysis.scenarios.neutral} />
        </div>
        <div className="border border-red-900 bg-red-950/20 p-3">
          <p className="font-bold text-red-300">偏空情景</p>
          <TextList items={analysis.scenarios.bearish} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500">失效条件</p>
          <TextList items={analysis.invalidation} />
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500">风险提示</p>
          <TextList items={analysis.risks} />
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500">数据缺口</p>
          <TextList items={analysis.dataGaps} />
        </div>
      </div>
      <p className="border border-zinc-800 bg-black p-3 text-xs text-zinc-400">{analysis.disclaimer}</p>
    </div>
  );
}

export default function LlmAnalysisPanel({ symbol, initialAnalyses }: { symbol: string; initialAnalyses: LlmAnalysisRecordPayload[] }) {
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/data/${encodeURIComponent(symbol)}/llm-analysis`, { method: "POST" });
      const payload = (await response.json()) as { analysis?: LlmAnalysisRecordPayload; error?: string };
      if (!response.ok || !payload.analysis) throw new Error(payload.error ?? "LLM 分析失败");
      setAnalyses((current) => [payload.analysis as LlmAnalysisRecordPayload, ...current]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "LLM 分析失败");
    } finally {
      setLoading(false);
    }
  }

  const latest = analyses[0];

  return (
    <section className="report-panel p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-yellow-300">
          <BrainCircuit size={18} />
          <h2 className="text-xl font-bold">LLM 交易计划草案</h2>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 border border-yellow-600 px-3 py-2 text-sm text-yellow-200 hover:border-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => void runAnalysis()}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
          手动分析
        </button>
      </div>

      {error ? <p className="mb-3 border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
      {latest?.analysis ? (
        <div className="grid gap-3">
          <p className="text-xs text-zinc-500">
            {latest.model} · {new Date(latest.createdAt).toLocaleString("zh-CN")}
          </p>
          <AnalysisView analysis={latest.analysis} />
        </div>
      ) : (
        <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无 LLM 分析记录。配置 LLM 后可手动生成交易计划草案。</p>
      )}

      {analyses.length > 1 ? (
        <div className="mt-4 border border-zinc-800 bg-black p-3">
          <p className="mb-2 text-xs text-zinc-500">历史分析记录</p>
          <div className="grid gap-2 text-xs">
            {analyses.slice(1).map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between border border-zinc-800 px-3 py-2">
                <span>{new Date(analysis.createdAt).toLocaleString("zh-CN")}</span>
                <span className={analysis.status === "success" ? "text-green-300" : "text-red-300"}>{analysis.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
