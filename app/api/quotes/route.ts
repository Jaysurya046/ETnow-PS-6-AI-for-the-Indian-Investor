import { NextResponse } from "next/server";
import { parseHoldings } from "@/lib/portfolio";
import { enrichHoldings } from "@/lib/portfolio-data";

export async function GET(request: Request) {
  const symbols = new URL(request.url).searchParams.get("symbols")?.split(",") ?? [];
  const holdings = parseHoldings(symbols.map(symbol => ({ symbol, qty: 1, avgCost: 1 })));
  if (!holdings) return NextResponse.json({ error: "Invalid symbols" }, { status: 400 });
  try {
    const quotes = await enrichHoldings(holdings);
    return NextResponse.json(quotes.map(({ symbol, cmp, quoteTime }) => ({ symbol, cmp, quoteTime })), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Quotes unavailable" }, { status: 502 });
  }
}
