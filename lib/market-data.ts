import yahooFinance from "@/lib/yahoo";
import { ttlCache } from "@/lib/cache";
import { NIFTY_100 } from "@/lib/nifty100";

const loadQuotes = ttlCache(async (symbols: string[]) => yahooFinance.quote(symbols));

export function getQuotes(symbols: string[]) {
  return loadQuotes([...new Set(symbols)].sort());
}

const SECTOR_INDICES = [
  { name:"IT", symbol:"^CNXIT" }, { name:"Banking", symbol:"^NSEBANK" },
  { name:"Auto", symbol:"^CNXAUTO" }, { name:"FMCG", symbol:"^CNXFMCG" },
  { name:"Metals", symbol:"^CNXMETAL" }, { name:"Pharma", symbol:"^CNXPHARMA" },
  { name:"Realty", symbol:"^CNXREALTY" }, { name:"Energy", symbol:"^CNXENERGY" },
];
export const getSectors = ttlCache(async () => {
  const quotes = await getQuotes(SECTOR_INDICES.map(index=>index.symbol));
  return SECTOR_INDICES.flatMap(index=> {
    const quote=quotes.find(quote=>quote.symbol===index.symbol);
    return quote && Number.isFinite(quote.regularMarketChangePercent) ? [{ ...index, change:quote.regularMarketChangePercent!, asOf:quote.regularMarketTime?.toISOString() ?? null }] : [];
  });
});

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
