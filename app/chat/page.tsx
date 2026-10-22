"use client";
import { useState, useRef, useEffect } from "react";
import { Plus, X, Send, Wallet } from "lucide-react";
import { PageHeading, PanelHeading, inr, signed } from "@/components/Terminal";
import SafeMarkdown from "@/components/SafeMarkdown";
import { parseHoldings, portfolioTotals, PORTFOLIO_KEY, type PortfolioItem } from "@/lib/portfolio";
import { readChatStream } from "@/lib/chat-stream";

interface Message {
  role: "user" | "ai";
  content: string;
  steps?: string[];
  sources?: string[];
  suggestions?: string[];
  isThinking?: boolean;
}

const QUICK_QUERIES = [
  "Analyze my portfolio risk",
  "RELIANCE stock deep dive",
  "Review my Mutual Fund allocation",
  "Explain market index risk",
  "Which sector should I invest in now?",
  "Explain FII vs DII flows today",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "Add holdings to provide portfolio context. Ask a research question or review your allocation and unrealized P&L.",
      suggestions: QUICK_QUERIES.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: "", qty: "", cost: "" });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showPortfolio, setShowPortfolio] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const totals = portfolioTotals(portfolio);
  const totalValue = totals.value, pnl = totals.pnl, pnlPct = totals.pnlPct;
  const symbolKey = [...new Set(portfolio.map(h => h.symbol))].sort().join(",");

  useEffect(() => {
    function restore() {
      try {
        const saved = localStorage.getItem(PORTFOLIO_KEY);
        const holdings = saved ? parseHoldings(JSON.parse(saved)) : [];
        if (holdings) setPortfolio(holdings);
        else setPortfolioError("Saved holdings are invalid. Add your holdings again.");
      } catch { setPortfolioError("Browser storage is unavailable or saved holdings could not be read."); }
      setPortfolioReady(true);
    }
    restore();
    return () => requestRef.current?.abort();
  }, []);
  useEffect(() => {
    if (!portfolioReady) return;
    try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio.map(({ symbol, qty, avgCost }) => ({ symbol, qty, avgCost })))); }
    catch { /* Holdings remain usable in memory when browser storage is blocked. */ }
  }, [portfolio, portfolioReady]);
  useEffect(() => {
    if (!symbolKey) return;
    const controller = new AbortController();
    async function refreshQuotes() {
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbolKey)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Quotes unavailable");
        const quotes: Pick<PortfolioItem, "symbol" | "cmp" | "quoteTime">[] = await res.json();
        if (!controller.signal.aborted) {
          setPortfolio(current => current.map(h => ({ ...h, cmp: quotes.find(q => q.symbol === h.symbol)?.cmp ?? null, quoteTime: quotes.find(q => q.symbol === h.symbol)?.quoteTime ?? null })));
          setPortfolioError(quotes.some(q => q.cmp === null) ? "Some quotes are unavailable and excluded from P&L." : "");
        }
      } catch {
        if (!controller.signal.aborted) {
          setPortfolio(current => current.map(h => ({ ...h, cmp: null, quoteTime: null })));
          setPortfolioError("Live quotes are unavailable. P&L excludes unpriced holdings.");
        }
      }
    }
    void refreshQuotes();
    const timer = setInterval(() => void refreshQuotes(), 30_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [symbolKey]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || busyRef.current) return;
    busyRef.current = true;
    setInput(""); setIsTyping(true);
    setMessages(m => [...m, { role: "user", content: q }, { role: "ai", content: "", isThinking: true, steps: ["Connecting to AI"] }]);
    const controller = new AbortController(); requestRef.current = controller;
    const update = (change: Partial<Message> | ((last: Message) => Partial<Message>)) => setMessages(messages => messages.map((message, index) => index === messages.length-1 ? { ...message, ...(typeof change === "function" ? change(message) : change) } : message));
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, portfolio, stream: true }), signal: controller.signal,
      });
      if (!res.ok) throw new Error("Chat request failed");
      await readChatStream(res, event => {
        if (event.type === "status") update({ steps: [event.message] });
        if (event.type === "delta") update(last => ({ content: last.content+event.text, isThinking: false }));
        if (event.type === "fallback") update({ content: event.content, isThinking: false });
        if (event.type === "done") update({ sources: event.sources, suggestions: event.suggestions, isThinking: false });
        if (event.type === "error") throw new Error(event.message);
      });
    } catch {
      if (!controller.signal.aborted) update(last => ({ isThinking: false, content: last.content ? `${last.content}\n\nResponse interrupted. Please try again.` : "Failed to connect to AI Engine. Please try again." }));
    } finally { busyRef.current = false; setIsTyping(false); }
  };

  return <div className="page research-page"><PageHeading index="04" title="Research desk" description="Portfolio-aware research with streaming responses."><button className="btn mobile-portfolio-toggle" aria-expanded={showPortfolio} aria-controls="portfolio-pane" onClick={() => setShowPortfolio(!showPortfolio)}><Wallet size={15} aria-hidden="true" />Holdings <span className="numeric">{portfolio.length}</span></button><span className="label-tag">BROWSER PORTFOLIO</span></PageHeading>
    <div className="chat-grid"><aside className={`portfolio-pane ${showPortfolio ? "is-open" : ""}`} id="portfolio-pane" aria-label="Portfolio holdings"><PanelHeading title="Portfolio" meta={`${portfolio.length} positions`} />
      <div className="portfolio-summary"><span className="eyebrow">UNREALIZED P&L</span><strong className={`numeric ${pnl >= 0 ? "positive" : "negative"}`}>{totals.priced ? `${pnl > 0 ? "+" : ""}${inr(pnl)}` : "—"}</strong><p className="numeric">{totals.priced ? `${signed(pnlPct)}% · ${inr(totalValue)}` : "Awaiting quotes"}</p><p><span className="numeric">{totals.priced}/{portfolio.length}</span> holdings priced · missing quotes excluded</p></div>
      {portfolioError && <p className="notice" role="status">{portfolioError}</p>}
      {!portfolio.length && <p className="empty-state">No holdings. Add a symbol, quantity and average cost.</p>}
      <ul className="holdings-list">{portfolio.map((h,i) => <li className="holding" key={`${h.symbol}-${i}`}><div className="holding-top"><button className="sort-button text-link" disabled={isTyping} onClick={() => void sendMessage(`Review my ${h.symbol} holding.`)}>{h.symbol}</button><button className="icon-button" aria-label={`Remove ${h.symbol} holding`} onClick={() => setPortfolio(current => current.filter((_,index) => index !== i))}><X size={14} aria-hidden="true" /></button></div><div className="holding-values"><div><span>Quantity</span><strong className="numeric">{h.qty.toLocaleString("en-IN")}</strong></div><div><span>Average cost</span><strong className="numeric">{inr(h.avgCost)}</strong></div><div><span>Last price</span><strong className="numeric">{inr(h.cmp)}</strong></div><div><span>P&L</span><strong className={`numeric ${h.cmp !== null && h.cmp < h.avgCost ? "negative" : "positive"}`}>{h.cmp === null ? "—" : inr((h.cmp-h.avgCost)*h.qty)}</strong></div></div>{h.quoteTime && <p className="holding-time">{new Date(h.quoteTime).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",hour12:false})} IST</p>}</li>)}</ul>
      <div className="panel-body"><button className="btn" aria-expanded={addingHolding} aria-controls="holding-form" onClick={() => setAddingHolding(!addingHolding)}><Plus size={14} aria-hidden="true" />Add holding</button></div>
      {addingHolding && <form className="holding-form" id="holding-form" onSubmit={e => {
        e.preventDefault();
        const parsed = parseHoldings([{symbol:newHolding.symbol.trim().toUpperCase(),qty:Number(newHolding.qty),avgCost:Number(newHolding.cost)}]);
        if (!parsed) {setPortfolioError("Enter a valid NSE symbol, positive quantity and average cost.");return;}
        setPortfolio(current => [...current,parsed[0]]);setAddingHolding(false);setNewHolding({symbol:"",qty:"",cost:""});
      }}><label className="field">NSE symbol<input value={newHolding.symbol} onChange={e => setNewHolding({...newHolding,symbol:e.target.value})} placeholder="e.g. TCS" required autoComplete="off" maxLength={30} /></label><div className="field-row"><label className="field">Quantity<input type="number" min="0.000001" step="any" value={newHolding.qty} onChange={e => setNewHolding({...newHolding,qty:e.target.value})} required /></label><label className="field">Average cost / ₹<input type="number" min="0.000001" step="any" value={newHolding.cost} onChange={e => setNewHolding({...newHolding,cost:e.target.value})} required /></label></div><button className="btn btn-primary" type="submit">Save holding</button></form>}
    </aside>
    <section className="conversation" aria-label="Research conversation"><PanelHeading title="Research thread" meta={isTyping ? "Receiving response" : "Portfolio context attached"} /><div className="messages" aria-busy={isTyping}>
      {messages.map((message,i) => <article className={`message ${message.role}`} key={i}><div className="message-author"><span className="numeric">{String(i+1).padStart(2,"0")}</span><span>{message.role === "ai" ? "ETNow Research" : "You"}</span></div>
        {message.isThinking ? <p className="message-status" role="status">{message.steps?.at(-1) ?? "Connecting…"}</p> : <div className="message-content">{message.role === "ai" ? <SafeMarkdown>{message.content}</SafeMarkdown> : message.content}</div>}
        {!!message.sources?.length && <p className="sources">Context: {message.sources.join(" · ")}</p>}
        {!!message.suggestions?.length && <div className="suggestions">{message.suggestions.map(query => <button className="suggestion-pill" key={query} disabled={isTyping} onClick={() => void sendMessage(query)}>{query}</button>)}</div>}
      </article>)}<div ref={messagesEndRef} />
    </div><form className="composer" onSubmit={e => {e.preventDefault();void sendMessage(input);}}><label className="field">Research question<textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();if(!isTyping) void sendMessage(input);}}} disabled={isTyping} placeholder="Ask about your holdings or a market concept. Shift+Enter for a new line." /></label><button className="btn btn-primary" type="submit" disabled={isTyping || !input.trim()}><Send size={14} aria-hidden="true" /><span>{isTyping ? "Receiving" : "Send"}</span></button></form></section>
    <aside className="context-pane" aria-label="Research context"><PanelHeading title="Context & sources" /><div className="context-note"><h3>Portfolio coverage</h3><p className="numeric">{totals.priced}/{portfolio.length} holdings priced</p><p>Latest available Yahoo Finance quotes. Unpriced holdings are excluded from valuation.</p></div><div className="context-note"><h3>Browser storage</h3><p>Holdings stay in this browser. Quotes are refreshed when you open the workspace and every 30 seconds.</p></div><div className="context-note"><h3>Research scope</h3><p>Responses use the supplied portfolio context. Current news and filings are not connected.</p></div><div className="context-note"><h3>Suggested questions</h3><div className="suggestions">{QUICK_QUERIES.slice(0,3).map(query => <button className="suggestion-pill" key={query} disabled={isTyping} onClick={() => void sendMessage(query)}>{query}</button>)}</div></div></aside></div>
  </div>;
}
