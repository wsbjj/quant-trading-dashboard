"use client";

import { CandlestickSeries, ColorType, createChart, HistogramSeries, type Time } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { SymbolDataPayload } from "@/lib/types";

type DailyBar = SymbolDataPayload["dailyBars"][number];

export default function HistoricalPriceChart({ bars }: { bars: DailyBar[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bars.length === 0) return;

    const chart = createChart(container, {
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: "#050505" },
        textColor: "#d4d4d8",
      },
      grid: {
        vertLines: { color: "rgba(82,82,91,0.32)" },
        horzLines: { color: "rgba(82,82,91,0.32)" },
      },
      rightPriceScale: {
        borderColor: "rgba(245,197,91,0.34)",
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: "rgba(245,197,91,0.34)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#86efac",
      wickDownColor: "#fca5a5",
    });
    candleSeries.setData(
      bars.map((bar) => ({
        time: bar.date.slice(0, 10) as Time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
    });
    volumeSeries.setData(
      bars.map((bar) => ({
        time: bar.date.slice(0, 10) as Time,
        value: bar.volume,
        color: bar.close >= bar.open ? "rgba(34,197,94,0.42)" : "rgba(239,68,68,0.42)",
      })),
    );
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [bars]);

  if (bars.length === 0) {
    return <div className="flex min-h-[260px] items-center justify-center border border-zinc-800 bg-black text-sm text-zinc-500">暂无日线数据</div>;
  }

  return <div ref={containerRef} className="h-[360px] w-full border border-zinc-800 bg-black" />;
}
