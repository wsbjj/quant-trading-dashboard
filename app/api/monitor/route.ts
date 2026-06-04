import { NextResponse } from "next/server";
import { getMonitorSnapshot } from "@/lib/services/stockData";

export async function GET() {
  const snapshot = await getMonitorSnapshot();
  return NextResponse.json(snapshot);
}
