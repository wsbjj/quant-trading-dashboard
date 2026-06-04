import { describe, expect, it } from "vitest";
import { computeFibonacciLevels, computeMarketMetrics } from "./metrics";

describe("market metrics", () => {
  it("computes Fibonacci retracements from low to high like the reference report", () => {
    const levels = computeFibonacciLevels({ low: 0.665, high: 0.729 });

    expect(levels.retracements["23.6"]).toBeCloseTo(0.7139, 4);
    expect(levels.retracements["38.2"]).toBeCloseTo(0.7046, 4);
    expect(levels.retracements["61.8"]).toBeCloseTo(0.6894, 4);
    expect(levels.extensions["1.272"]).toBeCloseTo(0.9273, 4);
  });

  it("derives turnover, float rotation and volume ratio when float is available", () => {
    const metrics = computeMarketMetrics({
      price: 0.729,
      volume: 8_560_000,
      freeFloat: 23_870_000,
      avgVolume: 214_000_000,
    });

    expect(metrics.turnover).toBeCloseTo(6_240_240, 0);
    expect(metrics.floatRotation).toBeCloseTo(0.3586, 4);
    expect(metrics.volumeRatio).toBeCloseTo(0.04, 2);
  });
});
