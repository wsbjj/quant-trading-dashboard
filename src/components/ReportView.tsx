import type { ReportLanguage, StockReport } from "@/lib/analysis/report";
import { formatCompact, formatPercent, formatPrice } from "@/lib/format";

const REPORT_UI: Record<
  ReportLanguage,
  {
    open: string;
    high: string;
    low: string;
    volume: string;
    turnover: string;
    freeFloat: string;
    squeezeAnalysis: string;
    shortInterest: string;
    daysToCover: string;
    costToBorrow: string;
    shortSqueezeScore: string;
    floatRotationAnalysis: string;
    floatRotation: string;
    volumeRatio: string;
    marketState: string;
    marketStates: Record<string, string>;
    structureMap: string;
    resistanceRegularHigh: string;
    vwapReference: string;
    overnightHigh: string;
    momentumTrigger: string;
    supportZone: string;
    majorSupport: string;
    failureLevel: string;
    above: string;
    below: string;
    fibonacciRetracements: string;
    microExtensions: string;
    mainExtensions: string;
    parabolicExtensions: string;
    newsCatalysts: string;
    catalystGrade: string;
    gradeLabels: Record<string, string>;
    categories: Record<string, string>;
    smartMoney: string;
    liquidityTrapZones: string;
    overheadSupplyZone: string;
    resistanceBand: string;
    breakdownRiskZone: string;
    tradePlan: string;
    bullishScenario: string;
    neutralScenario: string;
    bearishScenario: string;
    keyRiskFactors: string;
    notAvailable: string;
  }
> = {
  zh: {
    open: "开盘",
    high: "最高",
    low: "最低",
    volume: "成交量",
    turnover: "成交额",
    freeFloat: "自由流通股",
    squeezeAnalysis: "挤压分析",
    shortInterest: "空头持仓 %（估）",
    daysToCover: "Days to Cover",
    costToBorrow: "借券成本",
    shortSqueezeScore: "空头挤压评分",
    floatRotationAnalysis: "流通盘与换手分析",
    floatRotation: "流通盘轮换",
    volumeRatio: "量比",
    marketState: "市场状态",
    marketStates: { open: "交易中", closed: "已收盘", unknown: "X" },
    structureMap: "盘中结构图",
    resistanceRegularHigh: "阻力 / 日内高点",
    vwapReference: "VWAP / 盘中参照",
    overnightHigh: "隔夜高点",
    momentumTrigger: "动量触发位",
    supportZone: "支撑区",
    majorSupport: "主要支撑",
    failureLevel: "失效位",
    above: "站上",
    below: "跌破",
    fibonacciRetracements: "斐波那契回撤",
    microExtensions: "微扩展位",
    mainExtensions: "主扩展位",
    parabolicExtensions: "抛物线扩展",
    newsCatalysts: "新闻 / 催化剂",
    catalystGrade: "催化剂评级",
    gradeLabels: { BULLISH: "偏多", NEUTRAL: "中性", BEARISH: "偏空" },
    categories: { news: "新闻", sec: "SEC", fda: "FDA", clinical_trial: "临床试验" },
    smartMoney: "主力资金解读",
    liquidityTrapZones: "流动性陷阱区",
    overheadSupplyZone: "上方套牢筹码区",
    resistanceBand: "阻力带",
    breakdownRiskZone: "破位风险区",
    tradePlan: "交易计划",
    bullishScenario: "偏多情景",
    neutralScenario: "中性情景",
    bearishScenario: "偏空情景",
    keyRiskFactors: "关键风险因素",
    notAvailable: "X",
  },
  en: {
    open: "OPEN",
    high: "HIGH",
    low: "LOW",
    volume: "VOLUME",
    turnover: "TURNOVER",
    freeFloat: "FREE FLOAT",
    squeezeAnalysis: "SQUEEZE ANALYSIS",
    shortInterest: "Short Interest % (est.)",
    daysToCover: "Days to Cover",
    costToBorrow: "Cost to Borrow",
    shortSqueezeScore: "SHORT SQUEEZE SCORE",
    floatRotationAnalysis: "FLOAT & ROTATION ANALYSIS",
    floatRotation: "Float Rotation",
    volumeRatio: "Volume Ratio",
    marketState: "MARKET",
    marketStates: { open: "OPEN", closed: "CLOSED", unknown: "X" },
    structureMap: "INTRADAY STRUCTURE MAP",
    resistanceRegularHigh: "RESISTANCE / REGULAR HIGH",
    vwapReference: "VWAP / INTRADAY REFERENCE",
    overnightHigh: "OVERNIGHT HIGH",
    momentumTrigger: "MOMENTUM TRIGGER",
    supportZone: "SUPPORT ZONE",
    majorSupport: "MAJOR SUPPORT",
    failureLevel: "FAILURE LEVEL",
    above: "Above",
    below: "Below",
    fibonacciRetracements: "FIBONACCI RETRACEMENTS",
    microExtensions: "MICRO EXTENSIONS",
    mainExtensions: "MAIN EXTENSIONS",
    parabolicExtensions: "PARABOLIC EXTENSIONS",
    newsCatalysts: "NEWS / CATALYSTS",
    catalystGrade: "CATALYST GRADE",
    gradeLabels: { BULLISH: "BULLISH", NEUTRAL: "NEUTRAL", BEARISH: "BEARISH" },
    categories: { news: "news", sec: "sec", fda: "fda", clinical_trial: "clinical_trial" },
    smartMoney: "SMART MONEY INTERPRETATION",
    liquidityTrapZones: "LIQUIDITY TRAP ZONES",
    overheadSupplyZone: "overhead supply zone",
    resistanceBand: "resistance band",
    breakdownRiskZone: "breakdown risk zone",
    tradePlan: "TRADE PLAN",
    bullishScenario: "BULLISH SCENARIO",
    neutralScenario: "NEUTRAL SCENARIO",
    bearishScenario: "BEARISH SCENARIO",
    keyRiskFactors: "KEY RISK FACTORS",
    notAvailable: "X",
  },
};

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
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="grid grid-cols-[12px_1fr] gap-3 text-sm leading-snug">
          <span className={`mt-1.5 h-2.5 w-2.5 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportView({ report, language }: { report: StockReport; language: ReportLanguage }) {
  const market = report.sections.market;
  const structure = report.sections.structure;
  const ui = REPORT_UI[language];
  const copy = report.copy[language];
  const isDown = report.summary.change < 0;
  const marketState = ui.marketStates[report.summary.marketState] ?? report.summary.marketState.toUpperCase();
  const hasCatalysts = report.sections.catalyst.events.length > 0;
  const gradeLabel = hasCatalysts ? ui.gradeLabels[report.sections.catalyst.grade.label] ?? report.sections.catalyst.grade.label : "X";
  const gradeScore = hasCatalysts ? `${report.sections.catalyst.grade.score}/10` : "X";

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
              <p className="text-zinc-400">{ui.open}</p>
              <p>{formatPrice(market.open)}</p>
            </div>
            <div className="border-r border-yellow-900/60 p-2">
              <p className="text-zinc-400">{ui.high}</p>
              <p className="text-green-400">{formatPrice(market.high)}</p>
            </div>
            <div className="p-2">
              <p className="text-zinc-400">{ui.low}</p>
              <p className="text-red-400">{formatPrice(market.low)}</p>
            </div>
            <div className="border-r border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">{ui.volume}</p>
              <p>{formatCompact(market.volume)}</p>
            </div>
            <div className="border-r border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">{ui.turnover}</p>
              <p>{formatCompact(market.turnover)}</p>
            </div>
            <div className="border-t border-yellow-900/60 p-2">
              <p className="text-zinc-400">{ui.freeFloat}</p>
              <p>{formatCompact(market.freeFloat)}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="report-title mb-2 text-xl font-bold">{ui.squeezeAnalysis}</h2>
            <Row label={ui.shortInterest} value={report.sections.squeeze.shortInterest.value?.toString() ?? ui.notAvailable} tone="yellow" />
            <Row label={ui.daysToCover} value={report.sections.squeeze.daysToCover.value?.toString() ?? ui.notAvailable} />
            <Row label={ui.costToBorrow} value={report.sections.squeeze.costToBorrow.value?.toString() ?? ui.notAvailable} tone="red" />
            <div className="my-4 border-y border-dashed border-zinc-700 py-4 text-center">
              <p className="text-zinc-300">{ui.shortSqueezeScore}</p>
              <p className="text-4xl text-yellow-300">{report.sections.squeeze.score} / 100</p>
              <p className="report-title">{copy.squeezeLabel}</p>
            </div>
            <BulletList items={copy.squeezeNotes} tone="yellow" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-green-400">{ui.floatRotationAnalysis}</h2>
            <Row label={ui.freeFloat} value={formatCompact(market.freeFloat)} tone="green" />
            <Row label={ui.floatRotation} value={market.floatRotation !== null ? `${market.floatRotation.toFixed(2)}x` : ui.notAvailable} tone="yellow" />
            <Row label={ui.volumeRatio} value={market.volumeRatio !== null ? market.volumeRatio.toFixed(2) : ui.notAvailable} tone="blue" />
          </div>
        </section>

        <section className="report-panel p-3">
          <div className="text-center">
            <p className="text-lg text-zinc-300">{ui.marketState} {marketState}</p>
            <p className={`text-7xl font-black leading-none ${isDown ? "text-red-600" : "text-green-500"}`}>{formatPrice(report.summary.price)}</p>
            <p className={`text-3xl font-black ${isDown ? "text-red-500" : "text-green-400"}`}>
              {formatPrice(report.summary.change)} ({formatPercent(report.summary.percentChange)})
            </p>
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-bold text-blue-400">{ui.structureMap}</h2>
            <Row label={ui.resistanceRegularHigh} value={formatPrice(structure.regularHigh)} tone="red" />
            <Row label={ui.vwapReference} value={formatPrice(structure.vwap)} tone="yellow" />
            <Row label={ui.overnightHigh} value={formatPrice(structure.overnightHigh)} tone="red" />
            <Row label={ui.momentumTrigger} value={`${ui.above} ${formatPrice(structure.momentumTrigger)}`} tone="green" />
            <Row label={ui.supportZone} value={`${formatPrice(structure.supportZone.upper)} - ${formatPrice(structure.supportZone.lower)}`} />
            <Row label={ui.majorSupport} value={formatPrice(structure.majorSupport)} tone="blue" />
            <Row label={ui.failureLevel} value={`${ui.below} ${formatPrice(structure.failureLevel)}`} tone="red" />
          </div>

          <div className="mt-4">
            <h2 className="text-center text-2xl font-bold text-blue-400">{ui.fibonacciRetracements}</h2>
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
              <h3 className="text-center text-lg font-bold text-blue-400">{ui.microExtensions}</h3>
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
              <h3 className="text-center text-lg font-bold text-yellow-300">{ui.mainExtensions}</h3>
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
            <h2 className="text-center text-xl font-bold text-purple-400">{ui.parabolicExtensions}</h2>
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
          <h2 className="report-title text-2xl font-black">{ui.newsCatalysts}</h2>
          <div className="mt-2 border-b border-dashed border-zinc-700 pb-3">
            <p className="text-lg text-yellow-300">{ui.catalystGrade}: {gradeLabel} ({gradeScore})</p>
            <p className="mt-2 text-zinc-200">{hasCatalysts ? copy.catalystRationale : "X"}</p>
          </div>
          <div className="mt-3 space-y-3">
            {report.sections.catalyst.events.slice(0, 5).map((event) => (
              <a key={event.id} href={event.url ?? "#"} target="_blank" className="block border border-zinc-800 p-2 hover:border-yellow-500">
                <p className="text-sm text-yellow-300">
                  {new Date(event.date).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")} / {ui.categories[event.category] ?? event.category}
                </p>
                <p className="font-bold">{event.title}</p>
                {event.summary ? <p className="mt-1 text-sm text-zinc-400">{event.summary}</p> : null}
              </a>
            ))}
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-orange-300">{ui.smartMoney}</h2>
            <BulletList items={copy.smartMoney} tone="yellow" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-xl font-bold text-red-400">{ui.liquidityTrapZones}</h2>
            <Row label={`${formatPrice(structure.vwap)} - ${formatPrice(structure.overnightHigh)}`} value={ui.overheadSupplyZone} tone="red" />
            <Row label={`${formatPrice(structure.regularHigh)} - ${formatPrice(structure.vwap)}`} value={ui.resistanceBand} tone="yellow" />
            <Row label={`${formatPrice(structure.supportZone.upper)} - ${formatPrice(structure.supportZone.lower)}`} value={ui.supportZone} tone="green" />
            <Row label={`${ui.below} ${formatPrice(structure.failureLevel)}`} value={ui.breakdownRiskZone} tone="red" />
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-center text-xl font-bold text-green-400">{ui.tradePlan}</h2>
            <div className="mt-2 space-y-3">
              <div className="border border-green-800 p-3">
                <p className="mb-2 text-center font-bold text-green-400">{ui.bullishScenario}</p>
                <BulletList items={copy.tradePlan.bullish} tone="green" />
              </div>
              <div className="border border-yellow-800 p-3">
                <p className="mb-2 text-center font-bold text-yellow-300">{ui.neutralScenario}</p>
                <BulletList items={copy.tradePlan.neutral} tone="yellow" />
              </div>
              <div className="border border-red-900 p-3">
                <p className="mb-2 text-center font-bold text-red-400">{ui.bearishScenario}</p>
                <BulletList items={copy.tradePlan.bearish} tone="red" />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-yellow-900/50 pt-3">
            <h2 className="text-lg font-bold text-orange-300">{ui.keyRiskFactors}</h2>
            <BulletList items={copy.riskFactors} tone="red" />
            <p className="mt-3 border border-zinc-800 p-2 text-xs text-zinc-400">{copy.disclaimer}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
