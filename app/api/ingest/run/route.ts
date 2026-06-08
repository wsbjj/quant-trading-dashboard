import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { runDailyBarIngestion, runEventIngestion, runIntradayIngestion } from "@/lib/services/ingestion";

const schema = z.object({
  jobType: z.union([z.literal("intraday"), z.literal("daily"), z.literal("events")]),
  limit: z.number().int().min(1).optional(),
  force: z.boolean().optional(),
});

function isAuthorized(request: Request) {
  const secret = getServerEnv().ingestCronSecret;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ingestion request", issues: parsed.error.issues }, { status: 400 });
  }

  const options = {
    limit: parsed.data.limit,
    force: parsed.data.force,
    trigger: "api-cron",
  };

  try {
    const summary =
      parsed.data.jobType === "intraday"
        ? await runIntradayIngestion(options)
        : parsed.data.jobType === "daily"
          ? await runDailyBarIngestion(options)
          : await runEventIngestion(options);

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ingestion failed",
      },
      { status: 500 },
    );
  }
}
