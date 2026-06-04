import { NextResponse } from "next/server";
import { z } from "zod";
import { addWatchlistItem, listWatchlist, removeWatchlistItem, setMonitored } from "@/lib/services/watchlist";

const addSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().optional(),
  type: z.string().optional(),
  source: z.any().optional(),
});

const patchSchema = z.object({
  symbol: z.string().min(1),
  isMonitored: z.boolean(),
});

export async function GET() {
  const items = await listWatchlist();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = addSchema.parse(await request.json());
  const item = await addWatchlistItem({ ...body, source: body.source ?? "fixture" });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const body = patchSchema.parse(await request.json());
  const item = await setMonitored(body.symbol, body.isMonitored);
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  await removeWatchlistItem(symbol);
  return NextResponse.json({ ok: true });
}
