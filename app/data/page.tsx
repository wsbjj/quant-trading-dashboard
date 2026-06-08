import Link from "next/link";
import { ArrowLeft, Database, ListChecks, Table2 } from "lucide-react";
import { getDataOverview } from "@/lib/services/dataWarehouse";

function formatDate(value: string | null | undefined) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN");
}

export default async function DataOverviewPage() {
  const overview = await getDataOverview();
  const countCards = [
    { label: "日线", value: overview.counts.dailyBars },
    { label: "盘中快照", value: overview.counts.intradaySnapshots },
    { label: "事件", value: overview.counts.catalysts },
    { label: "采集任务", value: overview.counts.ingestionJobs },
  ];

  return (
    <main className="min-h-screen bg-[#090909] p-4 text-zinc-100 md:p-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm hover:border-yellow-400">
            <ArrowLeft size={16} />
            返回仪表盘
          </Link>
          <div className="flex items-center gap-2 text-yellow-300">
            <Database size={22} />
            <h1 className="text-3xl font-black md:text-5xl">历史数据仓库</h1>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {countCards.map((item) => (
          <div key={item.label} className="report-panel p-4">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-zinc-100">{item.value.toLocaleString("zh-CN")}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-green-300">
            <Table2 size={18} />
            <h2 className="text-xl font-bold">Symbol 覆盖情况</h2>
          </div>
          {overview.symbols.length === 0 ? (
            <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无采集数据。先开启监控并运行 intraday/daily/events 采集任务。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">名称</th>
                    <th className="py-2 pr-3 text-right">日线</th>
                    <th className="py-2 pr-3 text-right">快照</th>
                    <th className="py-2 pr-3 text-right">事件</th>
                    <th className="py-2 pr-3">最近日线</th>
                    <th className="py-2 pr-3">最近快照</th>
                    <th className="py-2 pr-3">最近事件</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.symbols.map((item) => (
                    <tr key={item.symbol} className="border-b border-zinc-900 hover:bg-zinc-950">
                      <td className="py-3 pr-3">
                        <Link href={`/data/${item.symbol}`} className="font-black text-yellow-200 hover:text-yellow-100">
                          {item.symbol}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-zinc-300">{item.name ?? "未知"}</td>
                      <td className="py-3 pr-3 text-right">{item.dailyBars.toLocaleString("zh-CN")}</td>
                      <td className="py-3 pr-3 text-right">{item.intradaySnapshots.toLocaleString("zh-CN")}</td>
                      <td className="py-3 pr-3 text-right">{item.catalysts.toLocaleString("zh-CN")}</td>
                      <td className="py-3 pr-3 text-xs text-zinc-400">{formatDate(item.lastDailyDate)}</td>
                      <td className="py-3 pr-3 text-xs text-zinc-400">{formatDate(item.lastSnapshotAt)}</td>
                      <td className="py-3 pr-3 text-xs text-zinc-400">{formatDate(item.lastEventDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="report-panel p-4">
          <div className="mb-4 flex items-center gap-2 text-yellow-300">
            <ListChecks size={18} />
            <h2 className="text-xl font-bold">最近采集任务</h2>
          </div>
          <div className="grid gap-2">
            {overview.recentJobs.length === 0 ? <p className="border border-zinc-800 bg-black p-4 text-sm text-zinc-400">暂无采集任务。</p> : null}
            {overview.recentJobs.map((job) => (
              <div key={job.id} className="border border-zinc-800 bg-black p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-zinc-100">{job.jobType}</span>
                  <span className={job.status === "success" ? "text-green-300" : job.status === "failed" ? "text-red-300" : "text-yellow-300"}>{job.status}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{formatDate(job.finishedAt ?? job.startedAt)}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  symbols {job.symbolCount} · requests {job.requestCount} · +{job.insertedCount} / ~{job.updatedCount}
                </p>
                {job.errorMessage ? <p className="mt-2 border border-red-900 bg-red-950/30 p-2 text-xs text-red-200">{job.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
