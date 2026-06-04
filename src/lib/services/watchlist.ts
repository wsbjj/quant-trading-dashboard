import type { SymbolSearchResult } from "../types";
import { prisma } from "../prisma";

export async function listWatchlist() {
  return prisma.watchlistItem.findMany({
    orderBy: [{ isMonitored: "desc" }, { updatedAt: "desc" }],
    include: { stock: true },
  });
}

export async function addWatchlistItem(input: SymbolSearchResult) {
  const symbol = input.symbol.toUpperCase();
  await prisma.stock.upsert({
    where: { symbol },
    update: {
      name: input.name,
      exchange: input.exchange,
    },
    create: {
      symbol,
      name: input.name,
      exchange: input.exchange,
    },
  });

  return prisma.watchlistItem.upsert({
    where: { symbol },
    update: {},
    create: {
      symbol,
      isMonitored: false,
    },
    include: { stock: true },
  });
}

export async function removeWatchlistItem(symbol: string) {
  return prisma.watchlistItem.delete({ where: { symbol: symbol.toUpperCase() } });
}

export async function setMonitored(symbol: string, isMonitored: boolean) {
  return prisma.watchlistItem.update({
    where: { symbol: symbol.toUpperCase() },
    data: { isMonitored },
    include: { stock: true },
  });
}
