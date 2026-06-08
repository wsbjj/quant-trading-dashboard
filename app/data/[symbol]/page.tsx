import Link from "next/link";
import { ArrowLeft, Bell, CandlestickChart, Clock3, Database, Table2 } from "lucide-react";
import HistoricalPriceChart from "@/components/HistoricalPriceChart";
import LlmAnalysisPanel from "@/components/LlmAnalysisPanel";
import { formatCompact, formatPrice, formatPercent } from "@/lib/format";
import { getSymbolData } from "@/lib/services/dataWarehouse";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

export default async function SymbolDataPage({ params }: PageProps) {
  const { symbol } = await params;
  const data = await getSymbolData(symbol);

  return (
    <main className="min-h-screen bg-[#090909] p-4 text-zinc-100 md:p-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Link href="/data" className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm hover:border-yellow-400">
              <ArrowLeft size={16} />
              返回数据仓库
            </Link>
            <Link href={`/report/${data.symbol}`} className="inline-flex items-center gap-2 border border-blue-800 px-3 py-2 text-sm text-blue-300 hover:border-blue-400">
              <CandlestickChart size={16} />
              分析报告
            </Link>
          </div>
          <div className="flex items-end gap-3">
            <h1 className="text-5xl font-black md:text-7xl">{data.symbol}</h1>
            <div className="pb-2">
              <p className="text-xl font-bold text-zinc-200">{data.stock?.name ?? "未知股票"}</p>
              <p className="text-xs text-zinc-500">{data.stock?.exchange ?? "UNKNOWN"} · {data.stock?.industry ?? "UNKNOWN"}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="report-panel p-4">
          <p className="text-xs text-zinc-500">日线</p>
          <p className="mt-2 text-3xl font-black">{data.dailyBars.length}</p>
        </div>
        <div className="report-panel p-4">
          <p className="text-xs text-zinc-500">盘中快照</p>
          <p className="mt-2 text-3xl font-black">{data.intradaySnapshots.length}</p>
        </div>
        <div className="report-panel p-4">
          <p className="text-xs text-zinc-500">事件</p>
          <p className="mt-2 text-3xl font-black">{data.catalysts.length}</p>
        </div>
        <div className="report-panel p-4">
          <p className="text-xs text-zinc-500">LLM 分析</p>
          <p className="mt-2 text-3xl font-black">{data.analyses.length}</p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-yellow-300">
            <CandlestickChart size={18} />
            <h2 className="text-xl font-bold">DailyBar K 线 / Volume</h2>
          </div>
          <HistoricalPriceChart bars={data.dailyBars} />
        </div>
        <LlmAnalysisPanel symbol={data.symbol} initialAnalyses={data.analyses} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-green-300">
            <Table2 size={18} />
            <h2 className="text-xl font-bold">日线记录</h2>
          </div>
          {data.dailyBars.length === 0 ? (
            <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无日线。运行 daily 采集后这里会显示最近 100 个交易日。</p>
          ) : (
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="sticky top-0 bg-black text-left text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3">日期</th>
                    <th className="py-2 pr-3 text-right">Open</th>
                    <th className="py-2 pr-3 text-right">High</th>
                    <th className="py-2 pr-3 text-right">Low</th>
                    <th className="py-2 pr-3 text-right">Close</th>
                    <th className="py-2 pr-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyBars.map((bar) => (
                    <tr key={`${bar.source}-${bar.date}`} className="border-b border-zinc-900">
                      <td className="py-2 pr-3 text-xs text-zinc-400">{bar.date.slice(0, 10)}</td>
                      <td className="py-2 pr-3 text-right">{formatPrice(bar.open, bar.open < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-green-300">{formatPrice(bar.high, bar.high < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-red-300">{formatPrice(bar.low, bar.low < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right font-bold">{formatPrice(bar.close, bar.close < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-zinc-400">{formatCompact(bar.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-blue-300">
            <Clock3 size={18} />
            <h2 className="text-xl font-bold">盘中快照</h2>
          </div>
          {data.intradaySnapshots.length === 0 ? (
            <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无盘中快照。运行 intraday 采集后这里会显示最近 200 条 quote 快照。</p>
          ) : (
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="sticky top-0 bg-black text-left text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3">时间</th>
                    <th className="py-2 pr-3 text-right">Price</th>
                    <th className="py-2 pr-3 text-right">Change</th>
                    <th className="py-2 pr-3 text-right">Open</th>
                    <th className="py-2 pr-3 text-right">High</th>
                    <th className="py-2 pr-3 text-right">Low</th>
                    <th className="py-2 pr-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intradaySnapshots.map((snapshot) => (
                    <tr key={`${snapshot.source}-${snapshot.asOf}`} className="border-b border-zinc-900">
                      <td className="py-2 pr-3 text-xs text-zinc-400">{formatDate(snapshot.asOf)}</td>
                      <td className="py-2 pr-3 text-right font-bold">{formatPrice(snapshot.currentPrice, snapshot.currentPrice < 1 ? 4 : 2)}</td>
                      <td className={snapshot.change >= 0 ? "py-2 pr-3 text-right text-green-300" : "py-2 pr-3 text-right text-red-300"}>
                        {formatPrice(snapshot.change, Math.abs(snapshot.change) < 1 ? 4 : 2)} ({formatPercent(snapshot.percentChange)})
                      </td>
                      <td className="py-2 pr-3 text-right">{formatPrice(snapshot.open, snapshot.open < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-green-300">{formatPrice(snapshot.high, snapshot.high < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-red-300">{formatPrice(snapshot.low, snapshot.low < 1 ? 4 : 2)}</td>
                      <td className="py-2 pr-3 text-right text-zinc-400">{formatCompact(snapshot.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 report-panel p-4">
        <div className="mb-4 flex items-center gap-2 text-yellow-300">
          <Bell size={18} />
          <h2 className="text-xl font-bold">事件催化剂</h2>
        </div>
        {data.catalysts.length === 0 ? (
          <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无事件。运行 events 采集后这里会显示最近 50 条催化剂。</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data.catalysts.map((event) => (
              <a
                key={event.id}
                href={event.url ?? "#"}
                target={event.url ? "_blank" : undefined}
                className="border border-zinc-800 bg-black p-3 hover:border-yellow-500"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase text-zinc-500">{event.category} · {event.source}</span>
                  <span className="text-xs text-zinc-500">{event.eventDate.slice(0, 10)}</span>
                </div>
                <p className="font-bold text-zinc-100">{event.title}</p>
                {event.summary ? <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{event.summary}</p> : null}
              </a>
            ))}
          </div>
        )}
      </section>

      {data.dailyBars.length === 0 && data.intradaySnapshots.length === 0 ? (
        <section className="mt-4 border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-100">
          <div className="flex items-center gap-2 font-bold">
            <Database size={16} />
            数据提示
          </div>
          <p className="mt-2 text-yellow-200/80">当前股票还没有日线或盘中快照。先把它加入监控列表，再运行 intraday/daily 采集任务。</p>
        </section>
      ) : null}
    </main>
  );
}
