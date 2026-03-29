import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

const TICKERS = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
  { symbol: "^NSEBANK", name: "BANK NIFTY" },
  { symbol: "^CNXIT", name: "NIFTY IT" },
  { symbol: "GC=F", name: "GOLD (COMEX)" },
  { symbol: "CL=F", name: "CRUDE OIL" },
  { symbol: "INR=X", name: "USD/INR" },
  { symbol: "RELIANCE.NS", name: "RELIANCE" },
  { symbol: "TCS.NS", name: "TCS" },
  { symbol: "HDFCBANK.NS", name: "HDFC BANK" },
];

export async function GET() {
  try {
    const rawQuotes = await yahooFinance.quote(TICKERS.map(t => t.symbol));
    const quotes: any[] = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];
    
    const formatted = TICKERS.map(t => {
      const q = quotes.find((q: any) => q.symbol === t.symbol);
      if (!q) return null;
      
      const price = q.regularMarketPrice || 0;
      const change = q.regularMarketChange || 0;
      const pct = (q.regularMarketChangePercent || 0).toFixed(2);
      
      const isPositive = change >= 0;
      
      let priceStr = price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      let changeStr = Math.abs(change).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      
      if (t.symbol === "GC=F" || t.symbol === "CL=F") {
        priceStr = "$" + priceStr;
        changeStr = (isPositive ? "+$" : "-$") + changeStr;
      } else {
        changeStr = (isPositive ? "+" : "-") + changeStr;
      }

      return {
        name: t.name,
        price: priceStr,
        change: changeStr,
        pct: (isPositive ? "+" : "") + pct + "%",
        up: isPositive,
      };
    }).filter(Boolean);

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching market data:", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
