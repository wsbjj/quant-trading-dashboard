import { describe, expect, it } from "vitest";
import { getAlphaDailyBars, parseAlphaDailyBars } from "./alphaVantage";

function makeDailyResponse(count: number) {
  const latest = new Date("2026-04-30T00:00:00.000Z");
  return {
    "Time Series (Daily)": Object.fromEntries(
      Array.from({ length: count }, (_, index) => {
        const date = new Date(latest);
        date.setUTCDate(latest.getUTCDate() - index);
        return [
          date.toISOString().slice(0, 10),
          {
            "1. open": String(index + 1),
            "2. high": String(index + 2),
            "3. low": String(index),
            "4. close": String(index + 1.5),
            "5. adjusted close": String(index + 1.25),
            "6. volume": String((index + 1) * 1000),
            "7. dividend amount": "0.0100",
            "8. split coefficient": "1.0",
          },
        ];
      }),
    ),
  };
}

describe("parseAlphaDailyBars", () => {
  it("parses up to 100 adjusted daily bars with adjusted fields", () => {
    const bars = parseAlphaDailyBars(makeDailyResponse(120), 100);

    expect(bars).toHaveLength(100);
    expect(bars[0]).toMatchObject({
      date: "2026-01-21",
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      adjustedClose: 100.25,
      volume: 100_000,
      dividendAmount: 0.01,
      splitCoefficient: 1,
    });
    expect(bars.at(-1)?.date).toBe("2026-04-30");
  });

  it("normalizes fixture fallback bars with adjusted fields", async () => {
    process.env.ALPHA_VANTAGE_API_KEY = "";

    const bars = await getAlphaDailyBars("AAPL");

    expect(bars.length).toBeGreaterThan(0);
    expect(bars[0]).toMatchObject({
      adjustedClose: expect.any(Number),
      dividendAmount: expect.any(Number),
      splitCoefficient: expect.any(Number),
    });
  });
});
