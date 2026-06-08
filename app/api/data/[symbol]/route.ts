import { NextResponse } from "next/server";
import { getSymbolData } from "@/lib/services/dataWarehouse";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { symbol } = await context.params;
  const data = await getSymbolData(symbol);
  return NextResponse.json(data);
}
