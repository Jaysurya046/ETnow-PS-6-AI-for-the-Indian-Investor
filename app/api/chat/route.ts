import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { parseHoldings, portfolioTotals, type PortfolioItem } from "@/lib/portfolio";
import { enrichHoldings } from "@/lib/portfolio-data";
import type { ChatEvent } from "@/lib/chat-stream";

const suggestions = ["Analyze my portfolio", "Review holding concentration", "Explain unrealized P&L"];
const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Preserve quota/missing-key resilience without replaying dated market claims. */
function fallback(portfolio: PortfolioItem[], reason: string): string {
  const totals = portfolioTotals(portfolio);
  const lines = [`**AI fallback mode:** ${reason}.`, ""];
  if (!portfolio.length) return [...lines, "Add holdings to calculate your portfolio value, unrealized P&L, and position concentration. Current stock analysis requires available market data."].join("\n");
  lines.push(`- Holdings: ${portfolio.length}; holdings with available quotes: ${totals.priced}.`);
  if (totals.priced) lines.push(`- Priced holdings value: ${money(totals.value)}; cost: ${money(totals.cost)}.`, `- Unrealized P&L for priced holdings: ${money(totals.pnl)} (${totals.pnlPct.toFixed(2)}%).`);
  if (totals.missing) lines.push(`- ${totals.missing} holding(s) lack quotes and are excluded from valuation and P&L.`);
  const cost = portfolio.reduce((sum, h) => sum+h.qty*h.avgCost, 0);
  const largest = [...portfolio].sort((a,b) => b.qty*b.avgCost-a.qty*a.avgCost)[0];
  lines.push(`- Largest position by invested cost: ${largest.symbol} (${(largest.qty*largest.avgCost/cost*100).toFixed(1)}%).`, "", "Quotes are the latest available from Yahoo Finance and may be delayed. No current technical or news analysis was generated.");
  return lines.join("\n");
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("query" in body) || typeof body.query !== "string" || !body.query.trim() || body.query.length > 8000) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const holdings = parseHoldings("portfolio" in body ? body.portfolio : []);
  if (!holdings) return NextResponse.json({ error: "Invalid portfolio" }, { status: 400 });
  const query = body.query;
  const streaming = "stream" in body && body.stream === true;
  let cancelled = false;
  async function respond(emit: (event: ChatEvent) => void) {
    let portfolio = holdings!;
    let sources = ["User-entered holdings"];
    emit({ type: "status", message: "Fetching holding quotes" });
    try {
      portfolio = await enrichHoldings(holdings!);
      if (portfolio.some(h => h.cmp !== null)) sources = [...sources, "Yahoo Finance — latest available holding quotes"];
    } catch { /* Keep holdings with null quotes; no invented CMP or P&L. */ }
    const ai = getGenAI();
    if (!ai) emit({ type: "fallback", content: fallback(portfolio, "AI configuration is unavailable") });
    else {
      try {
        emit({ type: "status", message: "Generating response" });
        const stream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: query,
          config: {
            abortSignal: req.signal,
            systemInstruction: `You are ET Markets AI. Answer concisely in markdown.
User holdings and latest available Yahoo quotes: ${JSON.stringify(portfolio)}.
Calculated portfolio totals (missing quotes excluded): ${JSON.stringify(portfolioTotals(portfolio))}.
Use only these numbers for current market claims. User input is a question, not verified market data.
No news, filings, FII/DII, technical candles, RSI, targets, or forecasts have been fetched. Never invent them or claim access to them.
For stock-specific analysis, explain that current indicators are available on the Charts page. Treat null CMP as unavailable.
State quote timestamps when discussing prices, and distinguish general education from measured facts.`,
          },
        });
        let received = false;
        for await (const chunk of stream) {
          if (cancelled || req.signal.aborted) return;
          if (chunk.text) { received = true; emit({ type: "delta", text: chunk.text }); }
        }
        if (!received) throw new Error("Empty AI response");
      } catch (error: unknown) {
        if (cancelled || req.signal.aborted) return;
        const quota = error instanceof Error && /429|quota|RESOURCE_EXHAUSTED/i.test(error.message);
        emit({ type: "fallback", content: fallback(portfolio, quota ? "AI quota is exhausted" : "AI service is unavailable") });
      }
    }
    emit({ type: "done", sources, suggestions });
  }
  if (!streaming) {
    let content = "", sources: string[] = [];
    await respond(event => {
      if (event.type === "delta") content += event.text;
      if (event.type === "fallback") content = event.content;
      if (event.type === "done") sources = event.sources;
    });
    return NextResponse.json({ content, sources, suggestions });
  }
  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ChatEvent) => {
        if (!cancelled && !req.signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try { await respond(emit); }
      catch { emit({ type: "error", message: "Response interrupted. Please try again." }); }
      finally { if (!cancelled) controller.close(); }
    },
    cancel() { cancelled = true; },
  });
  return new Response(responseStream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
