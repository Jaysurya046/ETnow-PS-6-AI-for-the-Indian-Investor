import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import yahooFinance from "@/lib/yahoo";

export async function POST(req: Request) {
  try {
    const { templateId } = await req.json();

    const rawQuotes = await yahooFinance.quote(["^NSEI", "^BSESN", "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]);
    const quotes: any[] = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];
    const contextStr = quotes.map((q: any) => `${q.symbol}: Price ${q.regularMarketPrice}, Change ${q.regularMarketChangePercent?.toFixed(2)}%`).join("\\n");

    const prompt = `You are the ET Markets AI Video Engine. Create a punchy, factual script and visual data based on the requested template and real live data below.
Template Requested: ${templateId}
Live Market Context:
${contextStr}

Structure your response exactly as JSON:
{
  "title": "A catchy title for the 45s video",
  "wrap": "A 3-4 sentence detailed markdown summary of the market close or current status. Use bolding, use ₹, and incorporate the live data I provided.",
  "movers": [
    { "stock": "Symbol", "change": "+X.XX%", "val": "₹XXXX", "dir": "up" or "down" }
  ],
  "script": ["3 to 5 short lines intended to be spoken by an AI voiceover"]
}
Limit "movers" to exactly 5 items based on the context data or your best logical inference. Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Video API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate video script" },
      { status: 500 }
    );
  }
}
