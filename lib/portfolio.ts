export interface PortfolioItem {
  symbol: string;
  qty: number;
  avgCost: number;
  cmp: number | null;
  quoteTime: string | null;
}

export const PORTFOLIO_KEY = "etnow.portfolio.v1";

export function parseHoldings(value: unknown): PortfolioItem[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const result: PortfolioItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { symbol, qty, avgCost } = item;
    if (typeof symbol !== "string" || !/^[A-Z0-9&-]{1,30}(\.NS)?$/.test(symbol)
      || typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 || qty > 1e9
      || typeof avgCost !== "number" || !Number.isFinite(avgCost) || avgCost <= 0 || avgCost > 1e9) return null;
    result.push({ symbol: symbol.replace(/\.NS$/, ""), qty, avgCost, cmp: null, quoteTime: null });
  }
  return result;
}

export function portfolioTotals(items: PortfolioItem[]) {
  const priced = items.filter((h): h is PortfolioItem & { cmp: number } => h.cmp !== null && Number.isFinite(h.cmp));
  const cost = priced.reduce((sum, h) => sum + h.avgCost*h.qty, 0);
  const value = priced.reduce((sum, h) => sum + h.cmp*h.qty, 0);
  return { cost, value, pnl: value-cost, pnlPct: cost ? (value-cost)/cost*100 : 0,
    priced: priced.length, missing: items.length-priced.length };
}
