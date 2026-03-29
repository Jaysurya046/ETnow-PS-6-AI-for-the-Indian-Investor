import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";
import { NIFTY_100 } from "@/lib/nifty100";

// Build a reverse lookup: display label → Yahoo Finance symbol
const symbolMap: Record<string, string> = {};
NIFTY_100.forEach(s => {
  // Key by the ticker without ".NS"
  symbolMap[s.sym.replace(".NS", "")] = s.sym;
});
// also handle legacy names used in the stock list
const aliases: Record<string, string> = {
  "HDFC BANK": "HDFCBANK.NS",
  "ICICI BANK": "ICICIBANK.NS",
  "LT": "LT.NS",
  "SBICARD": "SBICARD.NS",
  "NYKAA": "NYKAA.NS",
  "PAYTM": "PAYTM.NS",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "RELIANCE";
  const range = searchParams.get("range") || "1M";

  const nseSym =
    aliases[symbol] ||
    symbolMap[symbol] ||
    (symbol.endsWith(".NS") ? symbol : `${symbol}.NS`);

  try {
    const end = new Date();
    const start = new Date();
    let interval = "1d";

    if (range === "1D") {
      start.setDate(end.getDate() - 3);
      interval = "15m";
    } else if (range === "1W") {
      start.setDate(end.getDate() - 7);
      interval = "1h";
    } else if (range === "1M") {
      start.setMonth(end.getMonth() - 1);
      interval = "1d";
    } else if (range === "3M") {
      start.setMonth(end.getMonth() - 3);
      interval = "1d";
    } else if (range === "6M") {
      start.setMonth(end.getMonth() - 6);
      interval = "1d";
    } else if (range === "1Y") {
      start.setFullYear(end.getFullYear() - 1);
      interval = "1wk";
    }

    const result = await yahooFinance.chart(nseSym, {
      period1: start,
      period2: end,
      interval: interval as any,
    });

    const quotes: any[] = (result as any).quotes || [];
    const formatted = quotes
      .filter((q: any) => q.close !== null && q.open !== null)
      .map((q: any) => {
        const date = new Date(q.date);
        const timestamp = Math.floor(date.getTime() / 1000); // Unix seconds for lightweight-charts
        let label = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        if (range === "1D" || range === "1W") {
          label = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        }
        return {
          time: timestamp,
          label,
          open: +(q.open || 0).toFixed(2),
          high: +(q.high || 0).toFixed(2),
          low: +(q.low || 0).toFixed(2),
          close: +(q.close || 0).toFixed(2),
          volume: q.volume || 0,
        };
      });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
