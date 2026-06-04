import type { StockReport } from "@/lib/analysis/report";
import { formatCompact, formatPercent, formatPrice } from "@/lib/format";

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "blue" | "yellow" }) {
  const toneClass =
    tone === "green"
      ? "text-green-400"
      : tone === "red"
        ? "text-red-400"
        : tone === "blue"
          ? "text-blue-400"
          : tone === "yellow"
            ? "text-yellow-300"
            : "text-zinc-100";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-yellow-900/40 py-1.5">
      <span className="text-zinc-400">{label}</span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}

function BulletList({ items, tone = "green" }: { items: string[]; tone?: "green" | "red" | "yellow" | "blue" }) {
  const color = tone === "red" ? "bg-red-500" : tone === "yellow" ? "bg-yellow-400" : tone === "blue" ? "bg-blue-500" : "bg-green-500";
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[12px_1fr] gap-3 text-sm leading-snug">
          <span className={`mt-1.5 h-2.5 w-2.5 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportView({ report }: { report: StockReport }) {
  const market = report.sections.market;
  const structure = report.sections.structure;
  const isDown = report.summary.change < 0;

  return (
    <article className="scanline mx-auto max-w-[1500px] border border-yellow-900/60 bg-black">
      <div className="grid gap-0 lg:grid-cols-[31%_32%_37%]">
        <section className="report-panel p-3">
          <div className="mb-2">
            <h1 className="text-7xl font-black leading-none tracking-normal text-white md:text-8xl">{report.symbol}</h1>
            <p className="mt-2 text-2xl font-bold">{report.companyName}</p>
            <p className="report-title text-lg">({report.industry})</p>
          </div>
          <div className="grid grid-cols-3 border border-yellow-900/60 text-center text-sm">
            <div className="border-r border-yellow-900/60 p-2">
              <p className="text-zinc-400">OPEN</p>
              <p>{formatPrice(market.open)}</p>
            </div>
            <div className="border-r border-yellow-900/60 p-2">
              <p className="text-zinc-400">HIGH</p>
              <p className="text-green-400">{formatPrice(market.high)}</p>
            </div>
            <div className="p-2">
              <p className="text-zinc-400">LOW</p>
              <p className="text-red-400">{formatPrice(market.low)}</p>
            </div>
            <div className="border-r border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">VOLUME</p>
              <p>{formatCompact(market.volume)}</p>
            </div>
            <div className="border-r border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">TURNOVER</p>
              <p>{formatCompact(market.turnover)}</p>
            </div>
            <div className="border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">FREE FLOAT</p>
              <p>{formatCompact(market.freeFloat)}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="report-title mb-2 text-xl font-bold">SQUEEZE ANALYSIS</h2>
            <Row label="Short Interest % (est.)" value={report.sections.squeeze.shortInterest.value?.toString() ?? "N/A"} tone="yellow" />
            <Row label="Days to Cover" value={report.sections.squeeze.daysToCover.value?.toString() ?? "N/A"} />
            <Row label="Cost to Borrow" value={report.sections.squeeze.costToBorrow.value?.toString() ?? "N/A"} tone="red" />
            <div className="my-4 border-y border-dashed border-zinc-700 py-4 text-center">
              <p className="text-zinc-300">SHORT SQUEEZE SCORE</p>
              <p className="text-4xl text-yellow-300">{report.sections.squeeze.score} / 100</p>
              <p className="report-title">{report.sections.squeeze.label}</p>
            </div>
            <BulletList items={report.sections.squeeze.notes} tone="yellow" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-green-400">FLOAT & ROTATION ANALYSIS</h2>
            <Row label="Free Float" value={formatCompact(market.freeFloat)} tone="green" />
            <Row label="Float Rotation" value={market.floatRotation ? `${market.floatRotation.toFixed(2)}x` : "N/A"} tone="yellow" />
            <Row label="Volume Ratio" value={market.volumeRatio ? market.volumeRatio.toFixed(2) : "N/A"} tone="blue" />
          </div>
        </section>

        <section className="report-panel p-3">
          <div className="text-center">
            <p className="text-lg text-zinc-300">MARKET {report.summary.marketState.toUpperCase()}</p>
            <p className={`text-7xl font-black leading-none ${isDown ? "text-red-600" : "text-green-500"}`}>{formatPrice(report.summary.price)}</p>
            <p className={`text-3xl font-black ${isDown ? "text-red-500" : "text-green-400"}`}>
              {formatPrice(report.summary.change)} ({formatPercent(report.summary.percentChange)})
            </p>
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-bold text-blue-400">INTRADAY STRUCTURE MAP</h2>
            <Row label="RESISTANCE / REGULAR HIGH" value={formatPrice(structure.regularHigh)} tone="red" />
            <Row label="VWAP / INTRADAY REFERENCE" value={formatPrice(structure.vwap)} tone="yellow" />
            <Row label="OVERNIGHT HIGH" value={formatPrice(structure.overnightHigh)} tone="red" />
            <Row label="MOMENTUM TRIGGER" value={`Above ${formatPrice(structure.momentumTrigger)}`} tone="green" />
            <Row label="SUPPORT ZONE" value={`${formatPrice(structure.supportZone.upper)} - ${formatPrice(structure.supportZone.lower)}`} />
            <Row label="MAJOR SUPPORT" value={formatPrice(structure.majorSupport)} tone="blue" />
            <Row label="FAILURE LEVEL" value={`Below ${formatPrice(structure.failureLevel)}`} tone="red" />
          </div>

          <div className="mt-4">
            <h2 className="text-center text-2xl font-bold text-blue-400">FIBONACCI RETRACEMENTS</h2>
            <div className="mt-2 grid grid-cols-2 border border-yellow-900/60 text-center">
              {Object.entries(structure.fibonacci.retracements).map(([ratio, price]) => (
                <div key={ratio} className="contents">
                  <div className="border-b border-r border-yellow-900/60 p-1">{ratio}%</div>
                  <div className="border-b border-yellow-900/60 p-1">{formatPrice(price)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="text-center text-lg font-bold text-blue-400">MICRO EXTENSIONS</h3>
              <div className="grid grid-cols-2 border border-yellow-900/60 text-center text-sm">
                {Object.entries(structure.fibonacci.microExtensions).map(([ratio, price]) => (
                  <div key={ratio} className="contents">
                    <div className="border-b border-r border-yellow-900/60 p-1">{ratio}</div>
                    <div className="border-b border-yellow-900/60 p-1">{formatPrice(price)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-center text-lg font-bold text-yellow-300">MAIN EXTENSIONS</h3>
              <div className="grid grid-cols-2 border border-yellow-900/60 text-center text-sm">
                {Object.entries(structure.fibonacci.extensions).map(([ratio, price]) => (
                  <div key={ratio} className="contents">
                    <div className="border-b border-r border-yellow-900/60 p-1">{ratio}</div>
                    <div className="border-b border-yellow-900/60 p-1">{formatPrice(price)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-center text-xl font-bold text-purple-400">PARABOLIC EXTENSIONS</h2>
            <div className="grid grid-cols-2 border border-yellow-900/60 text-center">
              {Object.entries(structure.fibonacci.parabolicExtensions).map(([ratio, price]) => (
                <div key={ratio} className="contents">
                  <div className="border-b border-r border-yellow-900/60 p-1">{ratio}</div>
                  <div className="border-b border-yellow-900/60 p-1">{formatPrice(price)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-panel p-3">
          <h2 className="report-title text-2xl font-black">NEWS / CATALYSTS</h2>
          <div className="mt-2 border-b border-dashed border-zinc-700 pb-3">
            <p className="text-lg text-yellow-300">CATALYST GRADE: {report.sections.catalyst.grade.label} ({report.sections.catalyst.grade.score}/10)</p>
            <p className="mt-2 text-zinc-200">{report.sections.catalyst.grade.rationale}</p>
          </div>
          <div className="mt-3 space-y-3">
            {report.sections.catalyst.events.slice(0, 5).map((event) => (
              <a key={event.id} href={event.url ?? "#"} target="_blank" className="block border border-zinc-800 p-2 hover:border-yellow-500">
                <p className="text-sm text-yellow-300">{new Date(event.date).toLocaleDateString()} / {event.category}</p>
                <p className="font-bold">{event.title}</p>
                {event.summary ? <p className="mt-1 text-sm text-zinc-400">{event.summary}</p> : null}
              </a>
            ))}
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-orange-300">SMART MONEY INTERPRETATION</h2>
            <BulletList items={report.sections.smartMoney} tone="yellow" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-red-400">LIQUIDITY TRAP ZONES</h2>
            <Row label={`${formatPrice(structure.vwap)} - ${formatPrice(structure.overnightHigh)}`} value="overhead supply zone" tone="red" />
            <Row label={`${formatPrice(structure.regularHigh)} - ${formatPrice(structure.vwap)}`} value="resistance band" tone="yellow" />
            <Row label={`${formatPrice(structure.supportZone.upper)} - ${formatPrice(structure.supportZone.lower)}`} value="support zone" tone="green" />
            <Row label={`Below ${formatPrice(structure.failureLevel)}`} value="breakdown risk zone" tone="red" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-center text-xl font-bold text-green-400">TRADE PLAN</h2>
            <div className="mt-2 space-y-3">
              <div className="border border-green-800 p-3">
                <p className="mb-2 text-center font-bold text-green-400">BULLISH SCENARIO</p>
                <BulletList items={report.sections.tradePlan.bullish} tone="green" />
              </div>
              <div className="border border-yellow-800 p-3">
                <p className="mb-2 text-center font-bold text-yellow-300">NEUTRAL SCENARIO</p>
                <BulletList items={report.sections.tradePlan.neutral} tone="yellow" />
              </div>
              <div className="border border-red-900 p-3">
                <p className="mb-2 text-center font-bold text-red-400">BEARISH SCENARIO</p>
                <BulletList items={report.sections.tradePlan.bearish} tone="red" />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-lg font-bold text-orange-300">KEY RISK FACTORS</h2>
            <BulletList items={report.sections.riskFactors} tone="red" />
            <p className="mt-3 border border-zinc-800 p-2 text-xs text-zinc-400">{report.disclaimer}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
