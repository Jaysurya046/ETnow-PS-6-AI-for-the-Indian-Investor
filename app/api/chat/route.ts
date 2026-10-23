import { NextResponse } from "next/server";
import { getGenAI, DEFAULT_GEMINI_MODEL, withGeminiModel } from "@/lib/gemini";
import { getQuotes } from "@/lib/market-data";
import { NIFTY_100 } from "@/lib/nifty100";
import { parseHoldings, portfolioTotals, type PortfolioItem } from "@/lib/portfolio";
import { enrichHoldings } from "@/lib/portfolio-data";
import type { ChatEvent } from "@/lib/chat-stream";

const suggestions = ["Analyze my portfolio", "Review holding concentration", "Explain unrealized P&L"];
const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Preserve quota/missing-key resilience without replaying dated market claims. */
function referencedStocks(query: string, portfolio: PortfolioItem[]): string[] {
  const tokens = new Set(query.toUpperCase().match(/[A-Z0-9&-]+(?:\.NS)?/g)?.map(token => token.replace(/\.NS$/, "")) ?? []);
  return [...new Set([...NIFTY_100.map(stock => stock.sym.replace(/\.NS$/, "")), ...portfolio.map(item => item.symbol)])].filter(symbol => tokens.has(symbol));
}

function fallback(query: string, portfolio: PortfolioItem[], reason: string, quotes: Awaited<ReturnType<typeof getQuotes>>): string {
  const symbols = referencedStocks(query, portfolio);
  const available = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) ? money(value) : "Unavailable";
  if (symbols.length) return [`**AI fallback mode:** Stock analysis (${reason}).`, "", ...symbols.flatMap(symbol => {
    const quote = quotes.find(quote => quote.symbol === `${symbol}.NS`);
    const pct = quote?.regularMarketChangePercent;
    return [
      `### ${symbol}`,
      `- Instrument: ${symbol} (NSE Equity).`,
      `- Last available price: ${available(quote?.regularMarketPrice)}${typeof pct === "number" && Number.isFinite(pct) ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)` : ""}.`,
      `- Day range: ${available(quote?.regularMarketDayLow)} – ${available(quote?.regularMarketDayHigh)} | 52W range: ${available(quote?.fiftyTwoWeekLow)} – ${available(quote?.fiftyTwoWeekHigh)}.`,
      `- Quote time: ${quote?.regularMarketTime?.toISOString() ?? "Unavailable"}. Quotes may be delayed.`,
      `- Technical status: Review candles and EMA 20/50/200 on [Chart analysis](/charts?symbol=${symbol}). No indicators or news were fetched here.`, "",
    ];
  })].join("\n");
  const definitions: [RegExp, string][] = [
    [/\bp\s*\/\s*e\b|price.to.earnings/i, "**P/E (price-to-earnings)** divides share price by earnings per share. Compare the earnings period, sector and profitability; a low ratio alone does not establish value, and negative earnings limit its usefulness."],
    [/\brsi\b/i, "**RSI (Relative Strength Index)** measures momentum on a 0–100 scale, commonly over 14 bars. Levels above 70 or below 30 describe strong momentum or stretched conditions, not guaranteed reversals. The Chart analysis workspace calculates RSI from available candles."],
    [/\bfii\b|\bfpi\b/i, "**FII/FPI** refers to foreign institutional/portfolio investors. The institutional cash-flow feed reports daily gross purchases, sales and net purchases (buys minus sells) in ₹ crore. These figures are dated closing reports, not intraday flows or forecasts."],
    [/\bdii\b/i, "**DII** refers to domestic institutional investors, such as mutual funds and insurers. Net cash flow is purchases minus sales in ₹ crore. Compare its reporting date with FII/FPI flows; neither establishes why prices moved."],
    [/market\s+cap(?:italization)?/i, "**Market capitalization** is share price multiplied by outstanding shares. It measures equity market value, rather than enterprise value or revenue; classifications can change as prices and shares change."],
  ];
  const explanations = definitions.filter(([pattern]) => pattern.test(query)).map(([, definition]) => definition);
  if (explanations.length) return [`**AI fallback mode:** General financial education (${reason}).`, "", ...explanations].join("\n\n");
  if (!/\b(?:portfolio|risk|holdings?|allocation|pnl)\b|p\s*&\s*l/i.test(query)) return `**AI fallback mode:** ${reason}.\n\nYour question: ${JSON.stringify(query)}\n\nI cannot generate a researched answer to this question while AI is unavailable. Ask about a named NSE stock, your portfolio, or terms such as P/E, RSI, FII, DII or market cap for a factual fallback. Current news and forecasts have not been fetched.`;
  const totals = portfolioTotals(portfolio);
  const lines = [`**AI fallback mode:** ${reason}.`, ""];
  if (!portfolio.length) return [...lines, "Add holdings to calculate your portfolio value, unrealized P&L, and position concentration. Current stock analysis requires available market data."].join("\n");
  lines.push(`- Holdings: ${portfolio.length}; holdings with available quotes: ${totals.priced}.`);
  if (totals.priced) lines.push(`- Priced holdings value: ${money(totals.value)}; cost: ${money(totals.cost)}.`, `- Unrealized P&L for priced holdings: ${money(totals.pnl)} (${totals.pnlPct.toFixed(2)}%).`);
  if (totals.missing) lines.push(`- ${totals.missing} holding(s) lack quotes and are excluded from valuation and P&L.`);
  const cost = portfolio.reduce((sum, h) => sum+h.qty*h.avgCost, 0);
  const largest = [...portfolio].sort((a,b) => b.qty*b.avgCost-a.qty*a.avgCost)[0];
  lines.push(`- Largest position by invested cost: ${largest.symbol} (${(cost > 0 ? largest.qty*largest.avgCost/cost*100 : 0).toFixed(1)}%).`, "", "Quotes are the latest available from Yahoo Finance and may be delayed. No current technical or news analysis was generated.");
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
    let stockQuotes: Awaited<ReturnType<typeof getQuotes>> = [];
    const symbols = referencedStocks(query, portfolio);
    if (symbols.length) {
      try {
        stockQuotes = await getQuotes(symbols.map(symbol => `${symbol}.NS`));
        if (stockQuotes.length) sources.push("Yahoo Finance — latest available requested stock quotes");
      } catch { /* Unavailable quote fields remain explicit in the stock response. */ }
    }
    const ai = getGenAI();
    if (!ai) emit({ type: "fallback", content: fallback(query, portfolio, "AI configuration is unavailable", stockQuotes) });
    else {
      try {
        emit({ type: "status", message: "Generating response" });
        let received = false;
        await withGeminiModel(DEFAULT_GEMINI_MODEL, async model => {
        const stream = await ai.models.generateContentStream({
          model,
          contents: query,
          config: {
            abortSignal: req.signal,
            httpOptions: { timeout: 20_000 },
            systemInstruction: `You are ET Markets AI. Answer concisely in markdown.
User holdings and latest available Yahoo quotes: ${JSON.stringify(portfolio)}.
Calculated portfolio totals (missing quotes excluded): ${JSON.stringify(portfolioTotals(portfolio))}.
Latest available quotes for stocks referenced in the question: ${JSON.stringify(stockQuotes)}.
Use only these numbers for current market claims. User input is a question, not verified market data.
No news, filings, FII/DII, technical candles, RSI, targets, or forecasts have been fetched. Never invent them or claim access to them.
For stock-specific analysis, explain that current indicators are available on the Charts page. Treat null CMP as unavailable.
State quote timestamps when discussing prices, and distinguish general education from measured facts.`,
          },
        });
        for await (const chunk of stream) {
          if (cancelled || req.signal.aborted) return;
          if (chunk.text) { received = true; emit({ type: "delta", text: chunk.text }); }
        }
        if (!received) throw new Error("Empty AI response");
        }, () => !received && !cancelled && !req.signal.aborted);
      } catch (error: unknown) {
        if (cancelled || req.signal.aborted) return;
        const quota = error instanceof Error && /429|quota|RESOURCE_EXHAUSTED/i.test(error.message);
        emit({ type: "fallback", content: fallback(query, portfolio, quota ? "AI quota is exhausted" : "AI service is unavailable", stockQuotes) });
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
