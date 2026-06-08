"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock3, Database, KeyRound, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { IngestionStatusPayload } from "@/lib/types";

type SettingsPayload = {
  refreshIntervalSeconds: 15 | 30 | 60;
  maxMonitoredSymbols: number;
  apiKeyStatus: Record<string, boolean>;
  apiLimits: Array<{ label: string; officialLimit: string; appDefaultLimit: string; sourceUrl: string }>;
  refreshRisk: {
    level: "normal" | "elevated" | "high";
    estimatedFinnhubCallsPerMinute: number;
    message: string;
  };
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatusPayload | null>(null);
  const [maxMonitored, setMaxMonitored] = useState(25);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    void fetch("/api/settings")
      .then((response) => response.json())
      .then((data: SettingsPayload) => {
        setSettings(data);
        setMaxMonitored(data.maxMonitoredSymbols);
        setRefreshIntervalSeconds(data.refreshIntervalSeconds);
      });
    void fetch("/api/ingest/status")
      .then((response) => response.json())
      .then((data: IngestionStatusPayload) => setIngestionStatus(data))
      .catch(() => setIngestionStatus(null));
  }, []);

  async function save() {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxMonitoredSymbols: maxMonitored, refreshIntervalSeconds }),
    });
    setSettings((await response.json()) as SettingsPayload);
  }

  const riskTone =
    settings?.refreshRisk.level === "high"
      ? "border-red-900 bg-red-950/30 text-red-200"
      : settings?.refreshRisk.level === "elevated"
        ? "border-yellow-900 bg-yellow-950/30 text-yellow-200"
        : "border-green-900 bg-green-950/20 text-green-200";

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "暂无";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const ingestionCounts = [
    { label: "日线", value: ingestionStatus?.counts.dailyBars ?? 0 },
    { label: "快照", value: ingestionStatus?.counts.intradaySnapshots ?? 0 },
    { label: "事件", value: ingestionStatus?.counts.catalysts ?? 0 },
  ];

  return (
    <main className="min-h-screen bg-[#090909] p-4 text-zinc-100 md:p-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm hover:border-yellow-400">
        <ArrowLeft size={16} />
        返回仪表盘
      </Link>
      <section className="report-panel max-w-5xl p-5">
        <div className="mb-5 flex items-center gap-2 text-yellow-300">
          <KeyRound size={20} />
          <h1 className="text-3xl font-black">设置</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-800 bg-black p-4">
            <h2 className="mb-3 text-xl font-bold">本地监控配置</h2>
            <label className="grid gap-2 text-sm">
              监控刷新频率
              <select
                value={refreshIntervalSeconds}
                onChange={(event) => setRefreshIntervalSeconds(Number(event.target.value) as 15 | 30 | 60)}
                className="border border-zinc-700 bg-zinc-950 px-3 py-2"
              >
                <option value={15}>15 秒</option>
                <option value={30}>30 秒</option>
                <option value={60}>60 秒</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              最大实时监控股票数
              <input
                type="number"
                min={1}
                max={50}
                value={maxMonitored}
                onChange={(event) => setMaxMonitored(Number(event.target.value))}
                className="border border-zinc-700 bg-zinc-950 px-3 py-2"
              />
            </label>
            <p className={`mt-3 border p-2 text-xs ${riskTone}`}>
              预估 Finnhub quote 调用 {settings?.refreshRisk.estimatedFinnhubCallsPerMinute ?? 50}/分钟：
              {settings?.refreshRisk.message ?? "正在读取本地设置。"}
            </p>
            <button className="mt-4 inline-flex items-center gap-2 border border-green-700 px-3 py-2 text-green-300" onClick={save}>
              <Save size={16} />
              保存
            </button>
          </div>
          <div className="border border-zinc-800 bg-black p-4">
            <h2 className="mb-3 text-xl font-bold">API Key 状态</h2>
            <div className="grid gap-2 text-sm">
              {settings
                ? Object.entries(settings.apiKeyStatus).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between border border-zinc-800 px-3 py-2">
                      <span>{key}</span>
                      <span className={value ? "text-green-400" : "text-yellow-300"}>{value ? "已配置" : "未配置/可用降级"}</span>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
        <div className="mt-4 border border-zinc-800 bg-black p-4">
          <div className="mb-3 flex items-center gap-2 text-yellow-300">
            <Database size={18} />
            <h2 className="text-xl font-bold">数据采集状态</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {ingestionCounts.map((item) => (
              <div key={item.label} className="border border-zinc-800 p-3">
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-zinc-100">{item.value.toLocaleString("zh-CN")}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <div className="flex items-center justify-between border border-zinc-800 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-zinc-400">
                <Clock3 size={14} />
                盘中
              </span>
              <span>{formatDate(ingestionStatus?.lastSuccessfulAt.intraday)}</span>
            </div>
            <div className="flex items-center justify-between border border-zinc-800 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-zinc-400">
                <Clock3 size={14} />
                日线
              </span>
              <span>{formatDate(ingestionStatus?.lastSuccessfulAt.daily)}</span>
            </div>
            <div className="flex items-center justify-between border border-zinc-800 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-zinc-400">
                <Clock3 size={14} />
                事件
              </span>
              <span>{formatDate(ingestionStatus?.lastSuccessfulAt.events)}</span>
            </div>
          </div>
          {ingestionStatus?.recentError ? (
            <p className="mt-3 flex items-center gap-2 border border-red-900 bg-red-950/30 p-2 text-xs text-red-200">
              <AlertTriangle size={14} />
              {ingestionStatus.recentError.jobType}: {ingestionStatus.recentError.errorMessage ?? "采集失败"}
            </p>
          ) : null}
        </div>
        <div className="mt-4 border border-zinc-800 bg-black p-4">
          <h2 className="mb-3 text-xl font-bold">官方速率限制</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(settings?.apiLimits ?? []).map((limit) => (
              <a key={limit.label} href={limit.sourceUrl} target="_blank" className="border border-zinc-800 p-3 hover:border-yellow-400">
                <p className="font-bold">{limit.label}</p>
                <p className="mt-1 text-sm text-zinc-400">{limit.officialLimit}</p>
                <p className="mt-2 text-xs text-yellow-300">{limit.appDefaultLimit}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
