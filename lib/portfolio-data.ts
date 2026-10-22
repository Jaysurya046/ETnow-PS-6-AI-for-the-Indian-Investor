import { getQuotes } from "@/lib/market-data";
import type { PortfolioItem } from "@/lib/portfolio";

export async function enrichHoldings(holdings: PortfolioItem[]): Promise<PortfolioItem[]> {
  if (!holdings.length) return [];
  const quotes = await getQuotes(holdings.map(h => `${h.symbol}.NS`));
  return holdings.map(h => {
    const q = quotes.find(q => q.symbol === `${h.symbol}.NS`);
    return { ...h, cmp: q && Number.isFinite(q.regularMarketPrice) && q.regularMarketPrice! > 0 ? q.regularMarketPrice! : null,
      quoteTime: q?.regularMarketTime?.toISOString() ?? null };
  });
}
