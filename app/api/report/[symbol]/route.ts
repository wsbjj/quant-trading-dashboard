import { NextResponse } from "next/server";
import { getStockReport } from "@/lib/services/stockData";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { symbol } = await context.params;
  const report = await getStockReport(symbol);
  return NextResponse.json({ report });
}
