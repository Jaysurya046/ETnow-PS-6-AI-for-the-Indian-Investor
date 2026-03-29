import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import yahooFinance from "@/lib/yahoo";
import { NIFTY_100 } from "@/lib/nifty100";

// Build label → Yahoo symbol lookup from the shared Nifty 100 list
const symbolMap: Record<string, string> = {};
NIFTY_100.forEach(s => { symbolMap[s.sym.replace(".NS", "")] = s.sym; });
const aliases: Record<string, string> = {
  "HDFC BANK": "HDFCBANK.NS", "ICICI BANK": "ICICIBANK.NS",
  "LT": "LT.NS", "SBICARD": "SBICARD.NS",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "RELIANCE";
  const range = searchParams.get("range") || "1M";
  const nseSym = aliases[symbol] || symbolMap[symbol] || `${symbol}.NS`;

  // Fetch live quote — fall back gracefully if data is missing
  let price = 0, change = 0, high52 = 0, low52 = 0, avgVol = 0, mktCap = 0, pe = 0, eps = 0;
  try {
    const quote = await yahooFinance.quote(nseSym);
    const q: any = Array.isArray(quote) ? quote[0] : quote;
    price  = q?.regularMarketPrice ?? 0;
    change = q?.regularMarketChangePercent ?? 0;
    high52 = q?.fiftyTwoWeekHigh ?? 0;
    low52  = q?.fiftyTwoWeekLow ?? 0;
    avgVol = q?.averageDailyVolume3Month ?? 0;
    mktCap = q?.marketCap ?? 0;
    pe     = q?.trailingPE ?? 0;
    eps    = q?.epsTrailingTwelveMonths ?? 0;
  } catch (_) {
    // proceed with zeros — Gemini will use general market knowledge
  }

  const meta = NIFTY_100.find(s => s.sym.replace(".NS", "") === symbol);
  const sectorHint = meta ? `sector: ${meta.sector}, cap: ${meta.cap}` : "NSE-listed company";

  const priceStr  = price  ? `₹${price.toFixed(2)}`  : "N/A (use general knowledge)";
  const changeStr = price  ? `${change.toFixed(2)}%`  : "N/A";
  const h52Str    = high52 ? `₹${high52.toFixed(2)}`  : "N/A";
  const l52Str    = low52  ? `₹${low52.toFixed(2)}`   : "N/A";
  const volStr    = avgVol ? `${(avgVol/1e5).toFixed(1)} Lakh/day` : "N/A";
  const capStr    = mktCap ? `₹${(mktCap/1e11).toFixed(2)} Thousand Cr` : "N/A";
  const peStr     = pe     ? pe.toFixed(1)  : "N/A";
  const epsStr    = eps    ? `₹${eps.toFixed(2)}` : "N/A";

  const prompt = `You are a senior Indian equity analyst at ET Markets.
Analyze ${symbol} (NSE: ${nseSym}, ${sectorHint}) for the ${range} timeframe.

Live Market Data (use your general knowledge for any field marked N/A):
- Price: ${priceStr}, Day Change: ${changeStr}
- 52W High: ${h52Str}, 52W Low: ${l52Str}
- Avg Daily Volume: ${volStr}
- Market Cap: ${capStr}
- Trailing P/E: ${peStr}, EPS: ${epsStr}

Return ONLY valid JSON (no markdown) with EXACTLY this structure:
{
  "technicalInsights": [
    "Specific technical observation about trend/indicator for ${symbol}",
    "Support/resistance or moving average insight",
    "Candlestick, momentum, or breadth observation"
  ],
  "quantitativeInsights": [
    "PE or valuation insight vs sector peers",
    "Volume, turnover, or momentum metric",
    "Earnings, growth, or 52W positioning insight"
  ],
  "overallSentiment": "Bullish",
  "sentimentScore": 72
}

Rules:
- Each point: max 20 words, specific to ${symbol}.
- overallSentiment must be exactly "Bullish", "Bearish", or "Neutral".
- sentimentScore: integer 40-99.
- Return ONLY the JSON object. No markdown fences.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chart insights error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
