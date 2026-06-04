import type { HistoricalBar } from "../types";

export type FibonacciLevels = {
  retracements: Record<"23.6" | "38.2" | "61.8" | "78.6", number>;
  microExtensions: Record<"1.13" | "1.20" | "1.236", number>;
  extensions: Record<"1.272" | "1.414" | "1.618" | "2.000", number>;
  parabolicExtensions: Record<"2.272" | "2.618" | "3.000", number>;
};

export function round(value: number, decimals = 4) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function computeFibonacciLevels({ low, high }: { low: number; high: number }): FibonacciLevels {
  const range = high - low;
  const basis = high;

  return {
    retracements: {
      "23.6": round(high - range * 0.236),
      "38.2": round(high - range * 0.382),
      "61.8": round(high - range * 0.618),
      "78.6": round(high - range * 0.786),
    },
    microExtensions: {
      "1.13": round(basis * 1.13),
      "1.20": round(basis * 1.2),
      "1.236": round(basis * 1.236),
    },
    extensions: {
      "1.272": round(basis * 1.272),
      "1.414": round(basis * 1.414),
      "1.618": round(basis * 1.618),
      "2.000": round(basis * 2),
    },
    parabolicExtensions: {
      "2.272": round(basis * 2.272),
      "2.618": round(basis * 2.618),
      "3.000": round(basis * 3),
    },
  };
}

export function computeMarketMetrics(input: {
  price: number;
  volume: number;
  freeFloat?: number | null;
  avgVolume?: number | null;
}) {
  const turnover = input.price * input.volume;
  const floatRotation = input.freeFloat ? input.volume / input.freeFloat : null;
  const volumeRatio = input.avgVolume ? input.volume / input.avgVolume : null;

  return {
    turnover,
    floatRotation,
    volumeRatio,
  };
}

export function computeAverageVolume(bars: HistoricalBar[], fallbackVolume: number) {
  const usable = bars.filter((bar) => Number.isFinite(bar.volume) && bar.volume > 0).slice(-30);
  if (usable.length === 0) return fallbackVolume;
  return usable.reduce((sum, bar) => sum + bar.volume, 0) / usable.length;
}

export function computeVwap(bars: HistoricalBar[], fallbackPrice: number) {
  const usable = bars.filter((bar) => bar.volume > 0);
  if (usable.length === 0) return fallbackPrice;

  const totals = usable.reduce(
    (acc, bar) => {
      const typical = (bar.high + bar.low + bar.close) / 3;
      acc.priceVolume += typical * bar.volume;
      acc.volume += bar.volume;
      return acc;
    },
    { priceVolume: 0, volume: 0 },
  );

  return totals.volume > 0 ? totals.priceVolume / totals.volume : fallbackPrice;
}
