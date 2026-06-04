import { describe, expect, it } from "vitest";
import { buildProviderStatuses } from "./status";

describe("provider status aggregation", () => {
  it("starts required-key providers as missing_key when keys are absent", () => {
    const statuses = buildProviderStatuses({
      keyStatus: {
        finnhub: false,
        alphaVantage: false,
        openFda: false,
        secUserAgent: false,
        llm: false,
      },
      outcomes: {},
    });

    expect(statuses.finnhub).toBe("missing_key");
    expect(statuses.alphaVantage).toBe("missing_key");
    expect(statuses.sec).toBe("missing_key");
    expect(statuses.openFda).toBe("ok");
    expect(statuses.clinicalTrials).toBe("ok");
  });

  it("lets concrete provider outcomes override initial status", () => {
    const statuses = buildProviderStatuses({
      keyStatus: {
        finnhub: true,
        alphaVantage: true,
        openFda: true,
        secUserAgent: true,
        llm: false,
      },
      outcomes: {
        finnhub: "cached",
        alphaVantage: "rate_limited",
        sec: "error",
      },
    });

    expect(statuses.finnhub).toBe("cached");
    expect(statuses.alphaVantage).toBe("rate_limited");
    expect(statuses.sec).toBe("error");
    expect(statuses.openFda).toBe("ok");
  });

  it("ignores undefined outcomes when a provider did not run", () => {
    const statuses = buildProviderStatuses({
      keyStatus: {
        finnhub: true,
        alphaVantage: false,
        openFda: false,
        secUserAgent: true,
        llm: false,
      },
      outcomes: {
        finnhub: undefined,
      },
    });

    expect(statuses.finnhub).toBe("ok");
    expect(statuses.alphaVantage).toBe("missing_key");
  });
});
