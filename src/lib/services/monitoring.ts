export type MonitorBatchPlan = {
  activeSymbols: string[];
  staleSymbols: string[];
  nextCursor: number;
};

export type RefreshRisk = {
  level: "normal" | "elevated" | "high";
  estimatedFinnhubCallsPerMinute: number;
  message: string;
};

export function planMonitorBatch(input: {
  symbols: string[];
  maxBatchSize: number;
  cursor: number;
}): MonitorBatchPlan {
  const symbols = input.symbols.map((symbol) => symbol.toUpperCase());
  const maxBatchSize = Math.max(1, Math.floor(input.maxBatchSize));
  if (symbols.length === 0) return { activeSymbols: [], staleSymbols: [], nextCursor: 0 };
  if (symbols.length <= maxBatchSize) {
    return { activeSymbols: symbols, staleSymbols: [], nextCursor: 0 };
  }

  const start = ((Math.floor(input.cursor) % symbols.length) + symbols.length) % symbols.length;
  const activeSymbols = Array.from({ length: maxBatchSize }, (_, index) => symbols[(start + index) % symbols.length]);
  const active = new Set(activeSymbols);
  const staleSymbols = symbols.filter((symbol) => !active.has(symbol));

  return {
    activeSymbols,
    staleSymbols,
    nextCursor: (start + maxBatchSize) % symbols.length,
  };
}

export function classifyRefreshRisk(input: {
  refreshIntervalSeconds: 15 | 30 | 60;
  maxMonitoredSymbols: number;
}): RefreshRisk {
  const cyclesPerMinute = 60 / input.refreshIntervalSeconds;
  const estimatedFinnhubCallsPerMinute = Math.round(input.maxMonitoredSymbols * cyclesPerMinute);

  if (estimatedFinnhubCallsPerMinute > 60) {
    return {
      level: "high",
      estimatedFinnhubCallsPerMinute,
      message: "当前设置可能超过 Finnhub 免费档 60 calls/minute，建议降到 30 或 60 秒。",
    };
  }

  if (estimatedFinnhubCallsPerMinute > 50) {
    return {
      level: "elevated",
      estimatedFinnhubCallsPerMinute,
      message: "当前设置接近 Finnhub 免费档上限，网络重试或手动刷新可能触发限流。",
    };
  }

  return {
    level: "normal",
    estimatedFinnhubCallsPerMinute,
    message: "当前设置低于 Finnhub 免费档 60 calls/minute，并保留少量搜索和手动刷新空间。",
  };
}
