import { NextResponse } from "next/server";
import { getDataOverview } from "@/lib/services/dataWarehouse";

export async function GET() {
  const overview = await getDataOverview();
  return NextResponse.json(overview);
}
