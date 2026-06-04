import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/services/stockData";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const results = await searchStocks(q);
  return NextResponse.json({ results });
}
