import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runIntradayIngestion: vi.fn(),
  runDailyBarIngestion: vi.fn(),
  runEventIngestion: vi.fn(),
}));

vi.mock("@/lib/services/ingestion", () => ({
  runIntradayIngestion: mocks.runIntradayIngestion,
  runDailyBarIngestion: mocks.runDailyBarIngestion,
  runEventIngestion: mocks.runEventIngestion,
}));

function makeRequest(body: unknown, token?: string) {
  return new Request("http://localhost/api/ingest/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ingest/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INGEST_CRON_SECRET = "test-secret";
    mocks.runIntradayIngestion.mockResolvedValue({
      jobId: "job-1",
      jobType: "intraday",
      status: "success",
      trigger: "api-cron",
      symbols: ["AAPL"],
      symbolCount: 1,
      requestCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      errorMessage: null,
    });
    mocks.runDailyBarIngestion.mockResolvedValue({
      jobId: "job-2",
      jobType: "daily",
      status: "success",
      trigger: "api-cron",
      symbols: ["AAPL"],
      symbolCount: 1,
      requestCount: 1,
      insertedCount: 100,
      updatedCount: 0,
      errorMessage: null,
    });
    mocks.runEventIngestion.mockResolvedValue({
      jobId: "job-3",
      jobType: "events",
      status: "success",
      trigger: "api-cron",
      symbols: ["AAPL"],
      symbolCount: 1,
      requestCount: 5,
      insertedCount: 2,
      updatedCount: 0,
      errorMessage: null,
    });
  });

  it("rejects requests without the cron secret", async () => {
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ jobType: "intraday" }));

    expect(response.status).toBe(401);
    expect(mocks.runIntradayIngestion).not.toHaveBeenCalled();
  });

  it("runs intraday ingestion when the bearer secret is valid", async () => {
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ jobType: "intraday", limit: 2, force: true }, "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.runIntradayIngestion).toHaveBeenCalledWith({ limit: 2, force: true, trigger: "api-cron" });
    expect(payload.summary).toMatchObject({ jobId: "job-1", jobType: "intraday", status: "success" });
  });

  it.each([
    ["daily", mocks.runDailyBarIngestion, "job-2"],
    ["events", mocks.runEventIngestion, "job-3"],
  ] as const)("runs %s ingestion when the bearer secret is valid", async (jobType, runner, jobId) => {
    const { POST } = await import("./route");

    const response = await POST(makeRequest({ jobType }, "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(runner).toHaveBeenCalledWith({ limit: undefined, force: undefined, trigger: "api-cron" });
    expect(payload.summary).toMatchObject({ jobId, jobType, status: "success" });
  });
});
