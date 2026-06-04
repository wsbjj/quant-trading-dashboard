"use client";

import Link from "next/link";
import { Activity, BarChart3, Plus, RefreshCw, Search, Settings, ShieldCheck, Star, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatCompact, formatPrice, formatPercent } from "@/lib/format";
import type { NormalizedQuote, SymbolSearchResult } from "@/lib/types";

type WatchlistItem = {
  id: string;
  symbol: string;
  isMonitored: boolean;
  stock: {
    symbol: string;
    name: string;
    exchange?: string | null;
    industry?: string | null;
  };
};

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

type MonitorPayload = {
  quotes: NormalizedQuote[];
  staleCount: number;
  staleSymbols: string[];
  nextCursor: number;
  settings: SettingsPayload;
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export default function Dashboard() {
  const [query, setQuery] = useState("AIM");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [monitor, setMonitor] = useState<MonitorPayload | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monitoredSymbols = useMemo(() => new Set(watchlist.filter((item) => item.isMonitored).map((item) => item.symbol)), [watchlist]);

  async function loadWatchlist() {
    const data = await jsonFetch<{ items: WatchlistItem[] }>("/api/watchlist");
    setWatchlist(data.items);
  }

  async function loadMonitor() {
    const data = await jsonFetch<MonitorPayload>("/api/monitor");
    setMonitor(data);
    setSettings(data.settings);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [watchlistData, settingsData, monitorData] = await Promise.all([
          jsonFetch<{ items: WatchlistItem[] }>("/api/watchlist"),
          jsonFetch<SettingsPayload>("/api/settings"),
          jsonFetch<MonitorPayload>("/api/monitor"),
        ]);

        if (!active) return;
        setWatchlist(watchlistData.items);
        setSettings(monitorData.settings ?? settingsData);
        setMonitor(monitorData);
      } catch (nextError) {
        if (active) setError(nextError instanceof Error ? nextError.message : "Initial data load failed");
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const seconds = settings?.refreshIntervalSeconds ?? 30;
    const id = window.setInterval(() => {
      void loadMonitor().catch((nextError: Error) => setError(nextError.message));
    }, seconds * 1_000);
    return () => window.clearInterval(id);
  }, [settings?.refreshIntervalSeconds]);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await jsonFetch<{ results: SymbolSearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(data.results);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(item: SymbolSearchResult) {
    await jsonFetch("/api/watchlist", { method: "POST", body: JSON.stringify(item) });
    await loadWatchlist();
  }

  async function removeItem(symbol: string) {
    await jsonFetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    await Promise.all([loadWatchlist(), loadMonitor()]);
  }

  async function toggleMonitor(symbol: string, isMonitored: boolean) {
    await jsonFetch("/api/watchlist", { method: "PATCH", body: JSON.stringify({ symbol, isMonitored }) });
    await Promise.all([loadWatchlist(), loadMonitor()]);
  }

  async function updateRefreshInterval(value: 15 | 30 | 60) {
    const next = await jsonFetch<SettingsPayload>("/api/settings", {
      method: "POST",
      body: JSON.stringify({ refreshIntervalSeconds: value }),
    });
    setSettings(next);
  }

  const refreshRiskTone =
    settings?.refreshRisk.level === "high"
      ? "border-red-900 bg-red-950/30 text-red-200"
      : settings?.refreshRisk.level === "elevated"
        ? "border-yellow-900 bg-yellow-950/30 text-yellow-200"
        : "border-green-900 bg-green-950/20 text-green-200";

  return (
    <main className="min-h-screen bg-[#090909] text-zinc-100">
      <header className="border-b border-zinc-800 bg-[#101010] px-4 py-4 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-400">Free-first catalyst monitor</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">股票催化剂分析仪表盘</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/settings" className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm hover:border-yellow-400">
              <Settings size={16} />
              设置
            </Link>
            <button
              className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm hover:border-green-400"
              onClick={() => void loadMonitor()}
            >
              <RefreshCw size={16} />
              刷新监控
            </button>
          </nav>
        </div>
      </header>

      <section className="grid gap-4 px-4 py-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-yellow-300">
            <Search size={18} />
            <h2 className="text-xl font-bold">搜索股票</h2>
          </div>
          <form className="flex gap-2" onSubmit={submitSearch}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 border border-zinc-700 bg-black px-3 py-3 text-lg outline-none focus:border-yellow-400"
              placeholder="AIM / AAPL / MRNA"
            />
            <button className="inline-flex items-center gap-2 border border-yellow-500 px-4 py-2 text-yellow-200" disabled={loading}>
              <Search size={18} />
              搜索
            </button>
          </form>
          {error ? <p className="mt-3 border border-red-900 bg-red-950/40 p-2 text-sm text-red-200">{error}</p> : null}
          <div className="mt-4 grid gap-2">
            {results.map((item) => (
              <div key={item.symbol} className="flex flex-col justify-between gap-3 border border-zinc-800 bg-zinc-950 p-3 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{item.symbol}</span>
                    <span className="text-xs text-zinc-500">{item.exchange ?? item.type ?? item.source}</span>
                  </div>
                  <p className="text-sm text-zinc-300">{item.name}</p>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 border border-green-700 px-3 py-2 text-sm text-green-300 hover:border-green-400"
                  onClick={() => void addItem(item)}
                >
                  <Plus size={16} />
                  加关注
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-green-300">
            <ShieldCheck size={18} />
            <h2 className="text-xl font-bold">API 状态与频率</h2>
          </div>
          <div className="grid gap-2 text-sm">
            <label className="flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-950 p-3">
              <span>监控刷新频率</span>
              <select
                value={settings?.refreshIntervalSeconds ?? 30}
                onChange={(event) => void updateRefreshInterval(Number(event.target.value) as 15 | 30 | 60)}
                className="border border-zinc-700 bg-black px-2 py-1"
              >
                <option value={15}>15 秒</option>
                <option value={30}>30 秒</option>
                <option value={60}>60 秒</option>
              </select>
            </label>
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <p className={`mb-3 border p-2 text-xs ${refreshRiskTone}`}>
                预估 Finnhub quote 调用 {settings?.refreshRisk.estimatedFinnhubCallsPerMinute ?? 50}/分钟：
                {settings?.refreshRisk.message ?? "正在读取本地设置。"}
              </p>
              <p className="mb-2 text-zinc-400">官方限制摘要</p>
              <ul className="space-y-2">
                {(settings?.apiLimits ?? []).map((limit) => (
                  <li key={limit.label} className="grid gap-1">
                    <span className="font-bold text-zinc-100">{limit.label}</span>
                    <span className="text-xs text-zinc-400">{limit.officialLimit}</span>
                    <span className="text-xs text-yellow-300">{limit.appDefaultLimit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {settings
                ? Object.entries(settings.apiKeyStatus).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2 border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <span className="text-xs text-zinc-400">{key}</span>
                      <span className={value ? "text-xs text-green-300" : "text-xs text-yellow-300"}>{value ? "ready" : "missing"}</span>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-4 pb-6 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-yellow-300">
            <Star size={18} />
            <h2 className="text-xl font-bold">关注列表</h2>
          </div>
          <div className="grid gap-2">
            {watchlist.length === 0 ? (
              <p className="border border-zinc-800 p-4 text-sm text-zinc-400">先搜索股票并加入关注列表。</p>
            ) : null}
            {watchlist.map((item) => (
              <div key={item.symbol} className="grid gap-3 border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black">{item.symbol}</p>
                    <p className="text-sm text-zinc-400">{item.stock.name}</p>
                  </div>
                  <button className="border border-red-900 p-2 text-red-300 hover:border-red-500" onClick={() => void removeItem(item.symbol)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 border border-green-800 px-3 py-2 text-sm text-green-300 hover:border-green-400"
                    onClick={() => void toggleMonitor(item.symbol, !item.isMonitored)}
                  >
                    <Activity size={16} />
                    {item.isMonitored ? "停止监控" : "加入监控"}
                  </button>
                  <Link
                    href={`/report/${item.symbol}`}
                    className="inline-flex items-center gap-2 border border-blue-800 px-3 py-2 text-sm text-blue-300 hover:border-blue-400"
                  >
                    <BarChart3 size={16} />
                    分析页
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-green-300">
            <Activity size={18} />
            <h2 className="text-xl font-bold">监控列表</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(monitor?.quotes ?? []).map((quote) => (
              <Link key={quote.symbol} href={`/report/${quote.symbol}`} className="border border-zinc-800 bg-black p-4 hover:border-yellow-500">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-2xl font-black">{quote.symbol}</span>
                  <span className={quote.change >= 0 ? "text-green-400" : "text-red-400"}>{formatPercent(quote.percentChange)}</span>
                </div>
                <p className="text-4xl font-black">{formatPrice(quote.currentPrice, quote.currentPrice < 1 ? 4 : 2)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <span>Open {formatPrice(quote.open)}</span>
                  <span>High {formatPrice(quote.high)}</span>
                  <span>Low {formatPrice(quote.low)}</span>
                  <span>Vol {formatCompact(quote.volume)}</span>
                </div>
              </Link>
            ))}
          </div>
          {monitor?.staleCount ? (
            <p className="mt-4 border border-yellow-900 bg-yellow-950/30 p-3 text-sm text-yellow-200">
              有 {monitor.staleCount} 只股票延后到后续批次刷新：
              {monitor.staleSymbols.join(", ")}
            </p>
          ) : null}
          {monitoredSymbols.size === 0 ? <p className="border border-zinc-800 p-4 text-sm text-zinc-400">从关注列表中开启监控。</p> : null}
        </div>
      </section>
    </main>
  );
}
