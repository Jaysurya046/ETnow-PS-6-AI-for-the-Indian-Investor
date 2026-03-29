import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import yahooFinance from "@/lib/yahoo";
import { NIFTY_100 } from "@/lib/nifty100";

export async function GET() {
  try {
    const shuffled = [...NIFTY_100].sort(() => 0.5 - Math.random());
    const symbolMap = shuffled.slice(0, 8);

    const rawQuotes = await yahooFinance.quote(symbolMap.map(s => s.sym));
    const quotes: any[] = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];
    
    // Provide market context to AI
    const contextLines = symbolMap.map(s => {
      const q = quotes.find((q: any) => q.symbol === s.sym);
      return `${s.sym.replace(".NS", "")} (${s.name}, ${s.sector}): Price ₹${q?.regularMarketPrice || 0}, Change ${q?.regularMarketChangePercent?.toFixed(2) || 0}%`;
    }).join("\\n");

    const prompt = `You are the ET Markets AI Opportunity Radar. Create 8 highly actionable, realistic trading/investment signals based on the following real-time Indian stock market live data context. Invent plausible real-time "news" or "events" (like bulk deals, SEC filings, insider buys) that justify the current price action for these exact 8 stocks.

Live Market Context:
${contextLines}

Return EXACTLY 8 signal objects in a JSON array matching this structure exactly (NO outer object, just the array):
[
  {
    "id": 1,
    "stock": "TICKER_ONLY",
    "fullName": "Full Company Name",
    "sector": "Sector Name",
    "cap": "Large" | "Mid" | "Small",
    "type": "BUY" | "SELL" | "WATCH" | "INSIDER" | "ALERT",
    "event": "Short title of the event, e.g. 'Bulk Deal — Promoter Group'",
    "reasoning": "A 2-3 sentence logical explanation combining the live price action and the event.",
    "confidence": 85, // number between 50 and 99
    "price": "1,234.50", // string, format with commas, use the Live Context price!
    "target": "1,500.00", // string or 'N/A'
    "timeAgo": "12m ago", // string like '4m ago', '1h ago'
    "tags": ["Tag1", "Tag2", "Tag3"] // exactly 3 short string tags
  }
]
Return ONLY the JSON array. Make sure the type matches the enums.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Radar API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate radar signals" },
      { status: 500 }
    );
  }
}
