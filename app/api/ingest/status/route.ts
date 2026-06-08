import { NextResponse } from "next/server";
import { getIngestionStatus } from "@/lib/services/ingestion";

export async function GET() {
  const status = await getIngestionStatus();
  return NextResponse.json(status);
}
