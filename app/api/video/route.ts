import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { getMovers, getQuotes } from "@/lib/market-data";

export async function POST(req: Request) {
  const ai = getGenAI();
  if (!ai) return NextResponse.json({ error: "AI configuration unavailable" }, { status: 503 });
  try {
    const { templateId }: { templateId: unknown } = await req.json();
    if (typeof templateId !== "string" || !["daily-wrap", "fii-dii", "sector-rotation", "ipo-tracker", "top-movers"].includes(templateId)) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    const [quotes, movers] = await Promise.all([getQuotes(["^NSEI", "^BSESN", "^CNXIT", "^NSEBANK"]), getMovers()]);
    const context = quotes.map(q => ({ symbol: q.symbol, price: q.regularMarketPrice, change: q.regularMarketChangePercent, asOf: q.regularMarketTime }));
    const selectedMovers = [...movers.gainers, ...movers.losers];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write an ET Markets script preview for template ${templateId}.
Use ONLY these quotes and measured movers: ${JSON.stringify({ context, movers: selectedMovers })}.
Do not infer missing news, FII/DII flows, IPOs, future prices or causes. If the requested template requires unavailable data, explicitly say it is unavailable and summarize the supplied quotes.
Return JSON {"title": "short title", "wrap": "3 factual markdown sentences", "script": ["3 to 5 short spoken lines"]}.`,
      config: { responseMimeType: "application/json" },
    });
    const data: unknown = JSON.parse(response.text || "{}");
    if (!data || typeof data !== "object" || !("title" in data) || typeof data.title !== "string" || !("wrap" in data) || typeof data.wrap !== "string" || !("script" in data) || !Array.isArray(data.script) || !data.script.every(x => typeof x === "string")) throw new Error("Invalid script");
    return NextResponse.json({ title: data.title, wrap: data.wrap, script: data.script, movers: selectedMovers });
  } catch {
    return NextResponse.json({ error: "Failed to generate script" }, { status: 502 });
  }
}
