import { describe, expect, it } from "vitest";
import { classifyRefreshRisk, planMonitorBatch } from "./monitoring";

describe("monitoring batch planning", () => {
  it("rotates monitored symbols by cursor and reports stale symbols", () => {
    const symbols = ["AIM", "AAPL", "MRNA", "NVAX", "TSLA"];

    const first = planMonitorBatch({ symbols, maxBatchSize: 2, cursor: 0 });
    expect(first.activeSymbols).toEqual(["AIM", "AAPL"]);
    expect(first.staleSymbols).toEqual(["MRNA", "NVAX", "TSLA"]);
    expect(first.nextCursor).toBe(2);

    const second = planMonitorBatch({ symbols, maxBatchSize: 2, cursor: first.nextCursor });
    expect(second.activeSymbols).toEqual(["MRNA", "NVAX"]);
    expect(second.staleSymbols).toEqual(["AIM", "AAPL", "TSLA"]);
    expect(second.nextCursor).toBe(4);
  });

  it("wraps cursor and keeps all monitored symbols active when within the limit", () => {
    const symbols = ["AIM", "AAPL"];

    const planned = planMonitorBatch({ symbols, maxBatchSize: 25, cursor: 20 });

    expect(planned.activeSymbols).toEqual(["AIM", "AAPL"]);
    expect(planned.staleSymbols).toEqual([]);
    expect(planned.nextCursor).toBe(0);
  });
});

describe("refresh risk classification", () => {
  it("marks 15 second polling as risky when the watchlist can exceed Finnhub free quota", () => {
    expect(classifyRefreshRisk({ refreshIntervalSeconds: 15, maxMonitoredSymbols: 25 }).level).toBe("high");
  });

  it("marks the default 30 second / 25 symbol batch as acceptable", () => {
    expect(classifyRefreshRisk({ refreshIntervalSeconds: 30, maxMonitoredSymbols: 25 }).level).toBe("normal");
  });
});
