import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { getQuotes, normalizeSymbol } from "@/lib/market-data";
import { getChartData, RANGES, type TimeRange } from "@/lib/chart-data";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = normalizeSymbol(params.get("symbol") || "RELIANCE");
  const range = params.get("range") || "1M";
  if (!symbol || !RANGES.includes(range as TimeRange)) return NextResponse.json({ error: "Invalid symbol or range" }, { status: 400 });
  const ai = getGenAI();
  if (!ai) return NextResponse.json({ error: "AI configuration unavailable" }, { status: 503 });
  try {
    const [quotes, chart] = await Promise.all([getQuotes([symbol]), getChartData(symbol, range as TimeRange)]);
    const q = quotes[0];
    const context = { symbol, range, interval: chart.interval, asOf: chart.asOf,
      indicators: chart.analysis,
      quote: q ? { price: q.regularMarketPrice, change: q.regularMarketChangePercent, pe: q.trailingPE,
        eps: q.epsTrailingTwelveMonths, high52: q.fiftyTwoWeekHigh, low52: q.fiftyTwoWeekLow,
        volume: q.regularMarketVolume, marketCap: q.marketCap } : null };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize ONLY this measured data: ${JSON.stringify(context)}.
Do not invent news, forecasts, peer comparisons, earnings growth, indicators, or missing fields.
Periods refer to bars at the supplied interval, not necessarily days. Pivot levels use the previous bar.
Return JSON {"technicalInsights": [3 short observations], "quantitativeInsights": [3 short observations],
"overallSentiment": "Bullish" or "Bearish" or "Neutral"}. Mark unavailable metrics explicitly.`,
      config: { responseMimeType: "application/json" },
    });
    const data: unknown = JSON.parse(response.text || "{}");
    if (!data || typeof data !== "object" || !("technicalInsights" in data) || !("quantitativeInsights" in data)
      || !Array.isArray(data.technicalInsights) || !Array.isArray(data.quantitativeInsights)
      || !data.technicalInsights.every(x => typeof x === "string") || !data.quantitativeInsights.every(x => typeof x === "string")) throw new Error("Invalid insights");
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Insights unavailable" }, { status: 502 });
  }
}
