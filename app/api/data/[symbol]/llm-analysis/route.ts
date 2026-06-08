import { NextResponse } from "next/server";
import { LlmConfigurationError, LlmProviderError, runSymbolLlmAnalysis } from "@/lib/services/dataWarehouse";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { symbol } = await context.params;

  try {
    const analysis = await runSymbolLlmAnalysis(symbol);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM analysis failed";
    if (error instanceof LlmConfigurationError) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (error instanceof LlmProviderError) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
