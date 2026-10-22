import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market-data";

// The SDK results are cached for 30s; defer provider requests until runtime.
export const revalidate = 30;
export const dynamic = "force-dynamic";
const INDICES = [
  { name: "IT", symbol: "^CNXIT" }, { name: "Banking", symbol: "^NSEBANK" },
  { name: "Auto", symbol: "^CNXAUTO" }, { name: "FMCG", symbol: "^CNXFMCG" },
  { name: "Metals", symbol: "^CNXMETAL" }, { name: "Pharma", symbol: "^CNXPHARMA" },
  { name: "Realty", symbol: "^CNXREALTY" }, { name: "Energy", symbol: "^CNXENERGY" },
];
export async function GET() {
  try {
    const quotes = await getQuotes(INDICES.map(s => s.symbol));
    const sectors = INDICES.flatMap(index => {
      const quote = quotes.find(q => q.symbol === index.symbol);
      if (!quote || !Number.isFinite(quote.regularMarketChangePercent)) return [];
      const change = quote.regularMarketChangePercent!;
      return [{ ...index, change, asOf: quote.regularMarketTime?.toISOString() ?? null }];
    });
    if (!sectors.length) throw new Error("No sector quotes");
    return NextResponse.json(sectors);
  } catch {
    return NextResponse.json({ error: "Sector data is unavailable" }, { status: 502 });
  }
}
