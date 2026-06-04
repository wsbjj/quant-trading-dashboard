import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, updateAppSettings } from "@/lib/services/settings";

const schema = z.object({
  refreshIntervalSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  maxMonitoredSymbols: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const settings = await updateAppSettings(body);
  return NextResponse.json(settings);
}
