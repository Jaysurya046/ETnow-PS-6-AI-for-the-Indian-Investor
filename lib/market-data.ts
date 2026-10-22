import yahooFinance from "@/lib/yahoo";
import { ttlCache } from "@/lib/cache";
import { NIFTY_100 } from "@/lib/nifty100";

const loadQuotes = ttlCache(async (symbols: string[]) => yahooFinance.quote(symbols));

export function getQuotes(symbols: string[]) {
  return loadQuotes([...new Set(symbols)].sort());
}

export function normalizeSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase().replace(/\.NS$/, "");
  return /^[A-Z0-9&-]{1,30}$/.test(normalized) ? `${normalized}.NS` : null;
}

export interface Mover {
  stock: string;
  change: string;
  val: string;
  dir: "up" | "down";
}

export const getMovers = ttlCache(async () => {
  const quotes = await getQuotes(NIFTY_100.map(stock => stock.sym));
  const valid = quotes.filter(q => Number.isFinite(q.regularMarketPrice) && Number.isFinite(q.regularMarketChangePercent));
  const format = (q: typeof valid[number]): Mover => ({
    stock: q.symbol.replace(/\.NS$/, ""),
    change: `${q.regularMarketChangePercent! >= 0 ? "+" : ""}${q.regularMarketChangePercent!.toFixed(2)}%`,
    val: `₹${q.regularMarketPrice!.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    dir: q.regularMarketChangePercent! >= 0 ? "up" : "down",
  });
  return {
    gainers: valid.filter(q => q.regularMarketChangePercent! > 0).sort((a, b) => b.regularMarketChangePercent! - a.regularMarketChangePercent!).slice(0, 5).map(format),
    losers: valid.filter(q => q.regularMarketChangePercent! < 0).sort((a, b) => a.regularMarketChangePercent! - b.regularMarketChangePercent!).slice(0, 5).map(format),
    coverage: valid.length,
    universe: NIFTY_100.length,
  };
});
