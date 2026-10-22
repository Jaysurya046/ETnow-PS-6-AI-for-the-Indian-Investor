import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { getQuotes } from "@/lib/market-data";
import { NIFTY_100 } from "@/lib/nifty100";

export async function GET() {
  try {
    const quotes = await getQuotes(NIFTY_100.map(s => s.sym));
    const measured = quotes.filter(q => Number.isFinite(q.regularMarketPrice) && Number.isFinite(q.regularMarketChangePercent))
      .sort((a,b) => Math.abs(b.regularMarketChangePercent!)-Math.abs(a.regularMarketChangePercent!)).slice(0,8);
    if (!measured.length) throw new Error("Quotes unavailable");
    const signals = measured.map((q, index) => {
      const meta = NIFTY_100.find(s => s.sym === q.symbol)!;
      const change = q.regularMarketChangePercent!;
      return { id: index+1, stock: q.symbol.replace(/\.NS$/, ""), fullName: meta.name, sector: meta.sector, cap: meta.cap,
        type: "WATCH", event: change >= 0 ? "Positive daily price momentum" : "Negative daily price momentum",
        reasoning: `Latest quote changed ${change.toFixed(2)}% during the session. This is an observed price move; no news catalyst or trade recommendation has been verified.`,
        confidence: Math.min(100, Math.round(Math.abs(change)*10)),
        price: q.regularMarketPrice!.toLocaleString("en-IN", { maximumFractionDigits: 2 }), target: "N/A",
        timeAgo: q.regularMarketTime ? q.regularMarketTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })+" IST" : "Quote time unavailable",
        tags: ["Price momentum", "Yahoo Finance", "Latest available quote"] };
    });
    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Summarize the supplied daily price momentum only. Never invent news, filings, bulk deals, insider activity, regulatory events, technical indicators, targets, or future returns. No such data has been supplied.
Measured signals: ${JSON.stringify(signals)}.
Return a JSON array of {"stock": "supplied ticker", "reasoning": "one short observation based solely on supplied price change; no causal claim or recommendation"}.`,
          config: { responseMimeType: "application/json" },
        });
        const notes: unknown = JSON.parse(response.text || "[]");
        if (Array.isArray(notes)) for (const note of notes) {
          if (note && typeof note === "object" && typeof note.stock === "string" && typeof note.reasoning === "string") {
            const signal = signals.find(s => s.stock === note.stock);
            if (signal) signal.reasoning = note.reasoning;
          }
        }
      } catch { /* Measured signals remain available when AI is offline. */ }
    }
    return NextResponse.json(signals);
  } catch {
    return NextResponse.json({ error: "Radar quotes unavailable" }, { status: 502 });
  }
}
