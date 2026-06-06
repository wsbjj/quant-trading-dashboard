import type { CatalystEvent, NormalizedStockData } from "../types";
import {
  computeAverageVolume,
  computeFibonacciLevels,
  computeMarketMetrics,
  computeVwap,
  round,
} from "./metrics";

export type ReportLanguage = "zh" | "en";

export type ReportCopy = {
  catalystRationale: string;
  squeezeLabel: string;
  squeezeNotes: string[];
  smartMoney: string[];
  tradePlan: {
    bullish: string[];
    neutral: string[];
    bearish: string[];
  };
  riskFactors: string[];
  disclaimer: string;
};

export type CatalystGrade = {
  label: "BULLISH" | "NEUTRAL" | "BEARISH";
  score: number;
  rationale: string;
};

export type StockReport = {
  symbol: string;
  companyName: string;
  industry: string;
  generatedAt: string;
  summary: {
    marketState: string;
    price: number;
    change: number;
    percentChange: number;
    source: string;
  };
  sections: {
    market: ReturnType<typeof buildMarketSection>;
    catalyst: {
      grade: CatalystGrade;
      events: CatalystEvent[];
      keyDriver: string;
    };
    squeeze: {
      shortInterest: { value: number | null; status: "available" | "unavailable"; note: string };
      daysToCover: { value: number | null; status: "available" | "unavailable"; note: string };
      costToBorrow: { value: number | null; status: "available" | "unavailable"; note: string };
      score: number;
      label: string;
      notes: string[];
    };
    structure: ReturnType<typeof buildStructureSection>;
    smartMoney: string[];
    tradePlan: {
      bullish: string[];
      neutral: string[];
      bearish: string[];
    };
    riskFactors: string[];
  };
  copy: Record<ReportLanguage, ReportCopy>;
  providerStatuses: NormalizedStockData["providerStatuses"];
  disclaimer: string;
};

function buildMarketSection(data: NormalizedStockData) {
  const quote = data.quote;
  const avgVolume = computeAverageVolume(data.historical, quote.volume);
  const metrics = computeMarketMetrics({
    price: quote.currentPrice,
    volume: quote.volume,
    freeFloat: data.profile.freeFloat,
    avgVolume,
  });

  return {
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
    turnover: metrics.turnover,
    marketCap: data.profile.marketCap ?? null,
    totalShares: data.profile.shareOutstanding ?? null,
    freeFloat: data.profile.freeFloat ?? null,
    floatRotation: metrics.floatRotation,
    volumeRatio: metrics.volumeRatio,
    avgVolume,
  };
}

function buildCatalystGrade(events: CatalystEvent[]): CatalystGrade {
  if (events.length === 0) {
    return {
      label: "NEUTRAL",
      score: 5,
      rationale: "X",
    };
  }

  let score = 5;
  for (const event of events) {
    if (event.sentimentHint === "bullish") score += 3;
    if (event.sentimentHint === "bearish") score -= 1;
    if (/fda|trial|phase|approval|preclinical|presentation/i.test(event.title)) score += 1;
    if (/dilution|offering|financing|going concern/i.test(`${event.title} ${event.summary ?? ""}`)) score -= 1;
  }
  score = Math.min(10, Math.max(1, score));

  if (score >= 6) {
    return {
      label: "BULLISH",
      score,
      rationale: "Recent catalysts can attract attention and sentiment, while financing and liquidity risks cap conviction.",
    };
  }
  if (score <= 3) {
    return {
      label: "BEARISH",
      score,
      rationale: "Available events skew toward risk, dilution or weak confirmation.",
    };
  }
  return {
    label: "NEUTRAL",
    score,
    rationale: "Catalyst flow exists, but the current evidence is mixed or low conviction.",
  };
}

function availability(value?: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, status: "available" as const, note: "Free source provided this value." };
  }
  return {
    value: null,
    status: "unavailable" as const,
    note: "X",
  };
}

function buildSqueezeSection(data: NormalizedStockData, volumeRatio: number | null) {
  const shortInterest = availability(data.shortInterest?.shortInterestPercent);
  const daysToCover = availability(data.shortInterest?.daysToCover);
  const costToBorrow = availability(data.shortInterest?.costToBorrow);
  const lowVolumePenalty = volumeRatio !== null && volumeRatio < 0.2 ? 10 : 0;
  const siScore = shortInterest.value ? Math.min(45, shortInterest.value * 2) : 5;
  const dtcScore = daysToCover.value ? Math.min(30, daysToCover.value * 4) : 0;
  const ctbScore = costToBorrow.value ? Math.min(25, costToBorrow.value / 20) : 0;
  const score = Math.max(1, Math.round(siScore + dtcScore + ctbScore - lowVolumePenalty));

  return {
    shortInterest,
    daysToCover,
    costToBorrow,
    score,
    label: score >= 70 ? "HIGH SQUEEZE POTENTIAL" : score >= 40 ? "MODERATE SQUEEZE POTENTIAL" : "LOW SQUEEZE POTENTIAL",
    notes: [
      shortInterest.status === "unavailable"
        ? "X"
        : `Short interest at ${shortInterest.value}% contributes to squeeze baseline.`,
      daysToCover.status === "unavailable"
        ? "X"
        : `Days to cover at ${daysToCover.value} supports squeeze scoring.`,
      costToBorrow.status === "unavailable"
        ? "X"
        : `Cost to borrow at ${costToBorrow.value}% indicates elevated borrow costs.`,
      volumeRatio !== null && volumeRatio < 0.2
        ? "Low volume ratio indicates limited market participation."
        : "Volume participation is not extremely thin versus recent averages.",
    ],
  };
}

function buildStructureSection(data: NormalizedStockData) {
  const quote = data.quote;
  const vwap = computeVwap(data.historical, (quote.high + quote.low + quote.currentPrice) / 3);
  const fib = computeFibonacciLevels({ low: quote.low, high: quote.currentPrice });

  return {
    regularHigh: quote.high,
    vwap: round(vwap),
    overnightHigh: round(Math.max(quote.high, quote.afterHoursPrice ?? quote.high)),
    momentumTrigger: round(quote.high),
    supportZone: {
      upper: fib.retracements["23.6"],
      lower: fib.retracements["38.2"],
    },
    majorSupport: quote.low,
    failureLevel: round(quote.low),
    fibonacci: fib,
  };
}

function buildSmartMoney(structure: ReturnType<typeof buildStructureSection>, grade: CatalystGrade) {
  return [
    `Reclaim and hold above ${structure.regularHigh.toFixed(4)} would be the first bullish signal.`,
    `${structure.vwap.toFixed(4)} VWAP is the key intraday reference and confirmation level.`,
    `${structure.overnightHigh.toFixed(4)} is the next major resistance to clear.`,
    `Support zone ${structure.supportZone.upper.toFixed(4)} - ${structure.supportZone.lower.toFixed(4)} is the critical area to hold.`,
    `Overall: ${grade.label.toLowerCase()} catalyst-driven setup; price action should be treated as news and liquidity sensitive.`,
  ];
}

function buildRiskFactors(data: NormalizedStockData) {
  const risks = ["Very low liquidity and volume can create erratic moves.", "High volatility can invalidate technical levels quickly."];
  if (data.catalysts.some((event) => /dilution|offering|financing/i.test(`${event.title} ${event.summary ?? ""}`))) {
    risks.push("History of financing or dilution can limit upside conviction.");
  }
  if ((data.profile.industry ?? "").toLowerCase().includes("bio")) {
    risks.push("Regulatory, clinical and financing risk remain central for biotech setups.");
  }
  return risks;
}

function gradeLabelZh(label: CatalystGrade["label"]) {
  if (label === "BULLISH") return "偏多";
  if (label === "BEARISH") return "偏空";
  return "中性";
}

function buildCatalystRationaleZh(label: CatalystGrade["label"]) {
  if (label === "BULLISH") return "近期催化剂可能带来关注和情绪，但融资与流动性风险会压低确定性。";
  if (label === "BEARISH") return "现有事件更偏向风险、稀释或缺少强确认。";
  return "存在催化剂流，但当前证据混合，确定性不高。";
}

function buildSqueezeLabelZh(label: string) {
  if (/high/i.test(label)) return "高挤压潜力";
  if (/moderate/i.test(label)) return "中等挤压潜力";
  return "低挤压潜力";
}

function buildSqueezeNotesZh(squeeze: ReturnType<typeof buildSqueezeSection>, volumeRatio: number | null) {
  return [
    squeeze.shortInterest.status === "unavailable"
      ? "X"
      : `空头持仓比例为 ${squeeze.shortInterest.value}%，构成挤压评分基础。`,
    squeeze.daysToCover.status === "unavailable"
      ? "X"
      : `Days to cover 为 ${squeeze.daysToCover.value}，支持挤压评分。`,
    squeeze.costToBorrow.status === "unavailable"
      ? "X"
      : `借券成本为 ${squeeze.costToBorrow.value}%，显示借券成本偏高。`,
    volumeRatio !== null && volumeRatio < 0.2
      ? "成交量相对近期均量偏低，说明市场参与有限。"
      : "成交参与度相对近期均量并非极度稀薄。",
  ];
}

function buildSmartMoneyZh(structure: ReturnType<typeof buildStructureSection>, grade: CatalystGrade) {
  return [
    `重新站上并守住 ${structure.regularHigh.toFixed(4)} 将是第一个偏多信号。`,
    `${structure.vwap.toFixed(4)} VWAP 是盘中关键参照与确认位。`,
    `${structure.overnightHigh.toFixed(4)} 是下一个需要突破的主要阻力。`,
    `${structure.supportZone.upper.toFixed(4)} - ${structure.supportZone.lower.toFixed(4)} 支撑区是必须守住的关键区域。`,
    `整体：${gradeLabelZh(grade.label)}的催化剂驱动结构，价格行为需要按新闻和流动性敏感型处理。`,
  ];
}

function buildTradePlanZh(structure: ReturnType<typeof buildStructureSection>) {
  return {
    bullish: [
      `重新站上并守住 ${structure.regularHigh.toFixed(4)}。`,
      `随后突破 ${structure.vwap.toFixed(4)} VWAP 作为确认。`,
      `下一目标：${structure.overnightHigh.toFixed(4)} -> ${structure.fibonacci.extensions["1.272"].toFixed(4)}。`,
    ],
    neutral: [
      `在 ${structure.supportZone.lower.toFixed(4)} 到 ${structure.regularHigh.toFixed(4)} 区间震荡。`,
      `观察 ${structure.vwap.toFixed(4)} VWAP 判断盘中方向。`,
      "等待突破或跌破确认。",
    ],
    bearish: [
      `失守 ${structure.supportZone.upper.toFixed(4)} 支撑。`,
      `下破目标：${structure.supportZone.lower.toFixed(4)} -> ${structure.majorSupport.toFixed(4)}。`,
      `跌破 ${structure.failureLevel.toFixed(4)} 将提高下行风险。`,
    ],
  };
}

function buildRiskFactorsZh(data: NormalizedStockData) {
  const risks = ["极低流动性和成交量可能导致价格走势剧烈且失真。", "高波动可能快速打破技术位。"];
  if (data.catalysts.some((event) => /dilution|offering|financing/i.test(`${event.title} ${event.summary ?? ""}`))) {
    risks.push("融资或稀释历史可能限制上行确定性。");
  }
  if ((data.profile.industry ?? "").toLowerCase().includes("bio")) {
    risks.push("监管、临床和融资风险仍是生物科技标的的核心风险。");
  }
  return risks;
}

function buildReportCopy(input: {
  data: NormalizedStockData;
  grade: CatalystGrade;
  squeeze: ReturnType<typeof buildSqueezeSection>;
  structure: ReturnType<typeof buildStructureSection>;
  smartMoney: string[];
  tradePlan: ReportCopy["tradePlan"];
  riskFactors: string[];
  volumeRatio: number | null;
}): Record<ReportLanguage, ReportCopy> {
  return {
    en: {
      catalystRationale: input.grade.rationale,
      squeezeLabel: input.squeeze.label,
      squeezeNotes: input.squeeze.notes,
      smartMoney: input.smartMoney,
      tradePlan: input.tradePlan,
      riskFactors: input.riskFactors,
      disclaimer: "For educational purposes only. Not investment advice. Verify data independently and manage risk.",
    },
    zh: {
      catalystRationale: buildCatalystRationaleZh(input.grade.label),
      squeezeLabel: buildSqueezeLabelZh(input.squeeze.label),
      squeezeNotes: buildSqueezeNotesZh(input.squeeze, input.volumeRatio),
      smartMoney: buildSmartMoneyZh(input.structure, input.grade),
      tradePlan: buildTradePlanZh(input.structure),
      riskFactors: buildRiskFactorsZh(input.data),
      disclaimer: "仅供教育用途，不构成投资建议。请自行核验数据并控制风险。",
    },
  };
}

export function buildRuleBasedReport(data: NormalizedStockData): StockReport {
  const market = buildMarketSection(data);
  const grade = buildCatalystGrade(data.catalysts);
  const squeeze = buildSqueezeSection(data, market.volumeRatio);
  const structure = buildStructureSection(data);
  const smartMoney = buildSmartMoney(structure, grade);
  const tradePlan = {
    bullish: [
      `Reclaim and hold above ${structure.regularHigh.toFixed(4)}.`,
      `Then clear ${structure.vwap.toFixed(4)} VWAP for confirmation.`,
      `Next targets: ${structure.overnightHigh.toFixed(4)} -> ${structure.fibonacci.extensions["1.272"].toFixed(4)}.`,
    ],
    neutral: [
      `Range between ${structure.supportZone.lower.toFixed(4)} and ${structure.regularHigh.toFixed(4)}.`,
      `Watch ${structure.vwap.toFixed(4)} VWAP for intraday bias.`,
      "Wait for breakout or breakdown confirmation.",
    ],
    bearish: [
      `Lose ${structure.supportZone.upper.toFixed(4)} support.`,
      `Breakdown targets: ${structure.supportZone.lower.toFixed(4)} -> ${structure.majorSupport.toFixed(4)}.`,
      `Failure below ${structure.failureLevel.toFixed(4)} increases downside risk.`,
    ],
  };
  const riskFactors = buildRiskFactors(data);
  const catalyst = {
    grade,
    events: data.catalysts,
    keyDriver:
      data.catalysts[0]?.title ??
      "X",
  };

  return {
    symbol: data.symbol,
    companyName: data.profile.name,
    industry: data.profile.industry ?? "X",
    generatedAt: new Date().toISOString(),
    summary: {
      marketState: data.quote.marketState,
      price: data.quote.currentPrice,
      change: data.quote.change,
      percentChange: data.quote.percentChange,
      source: data.quote.source,
    },
    sections: {
      market,
      catalyst,
      squeeze,
      structure,
      smartMoney,
      tradePlan,
      riskFactors,
    },
    copy: buildReportCopy({
      data,
      grade,
      squeeze,
      structure,
      smartMoney,
      tradePlan,
      riskFactors,
      volumeRatio: market.volumeRatio,
    }),
    providerStatuses: data.providerStatuses,
    disclaimer: "仅供教育用途，不构成投资建议。请自行核验数据并控制风险。",
  };
}
