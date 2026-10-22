"use client";
import { useState, useRef, useEffect } from "react";
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
  "Nifty 50 outlook for 2026",
  "Which sector should I invest in now?",
  "Explain FII vs DII flows today",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "👋 I'm your ET Markets AI. Add your holdings for portfolio context and latest available Yahoo Finance quotes. Ask about your portfolio or market concepts.",
      suggestions: QUICK_QUERIES.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: "", qty: "", cost: "" });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const renderContent = (text: string) => <SafeMarkdown>{text}</SafeMarkdown>;

  return (
    <div className="page" style={{ padding: 0, maxWidth: "100%", height: "calc(100vh - var(--header-height))", display: "flex" }}>
      {/* Portfolio Sidebar */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        padding: 20, background: "var(--bg-secondary)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
          📊 Your Portfolio
        </div>

        {/* P&L Summary */}
        <div style={{
          background: pnl >= 0 ? "var(--green-dim)" : "var(--red-dim)",
          border: `1px solid ${pnl >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>P&L · {totals.priced}/{portfolio.length} holdings priced</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: pnl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
            {totals.priced ? `${pnl >= 0 ? "+" : "-"}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Unavailable"}
          </div>
          <div style={{ fontSize: 12, color: pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
            {totals.priced ? `${pnl >= 0 ? "▲" : "▼"} ${Math.abs(pnlPct).toFixed(1)}% · ₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })} priced value` : "Awaiting available quotes"}
          </div>
        </div>

        {portfolioError && <p role="status" style={{ fontSize: 11, color: "var(--gold)" }}>{portfolioError}</p>}
        {portfolio.length === 0 && <p style={{ fontSize: 12 }}>Add holdings to see your portfolio.</p>}
        {/* Holdings */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {portfolio.map((h, i) => {
            const hPnl = h.cmp === null ? null : (h.cmp - h.avgCost) * h.qty;
            const hPct = h.cmp === null ? null : ((h.cmp - h.avgCost) / h.avgCost) * 100;
            return (
              <div key={i} style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).getAttribute("data-action") !== "delete") {
                    sendMessage(`Provide a comprehensive technical analysis for ${h.symbol}.`);
                  }
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{h.symbol}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: (hPnl ?? 0) >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
                      {hPnl !== null && hPnl >= 0 ? "+" : ""}{hPnl === null ? "Unavailable" : `₹${hPnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Avg: ₹{h.avgCost}</span>
                    <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>CMP: {h.cmp === null ? "Unavailable" : `₹${h.cmp.toLocaleString("en-IN")}`}</span>
                  </div>
                  {h.quoteTime && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(h.quoteTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.qty} qty</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: (hPnl ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                      {hPct !== null && hPct >= 0 ? "+" : ""}{hPct === null ? "—" : `${hPct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
                <button
                  data-action="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPortfolio(portfolio.filter((_, idx) => idx !== i));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--red)",
                    cursor: "pointer",
                    fontSize: 12,
                    marginLeft: 8,
                    padding: "0 4px",
                    flexShrink: 0,
                  }}
                  title="Remove holding"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setAddingHolding(!addingHolding)}
          className="btn btn-ghost"
          style={{ marginTop: 12, fontSize: 12, justifyContent: "center" }}
        >
          + Add Holding
        </button>

        {addingHolding && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="input" placeholder="Symbol (e.g. WIPRO)" style={{ fontSize: 12 }}
              value={newHolding.symbol} onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value })} />
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input" placeholder="Qty" style={{ fontSize: 12 }}
                value={newHolding.qty} onChange={(e) => setNewHolding({ ...newHolding, qty: e.target.value })} />
              <input className="input" placeholder="Avg ₹" style={{ fontSize: 12 }}
                value={newHolding.cost} onChange={(e) => setNewHolding({ ...newHolding, cost: e.target.value })} />
            </div>

            <button className="btn btn-primary" style={{ fontSize: 11, justifyContent: "center" }}
              onClick={() => {
                const parsed = parseHoldings([{ symbol: newHolding.symbol.trim().toUpperCase(), qty: Number(newHolding.qty), avgCost: Number(newHolding.cost) }]);
                if (!parsed) { setPortfolioError("Enter a valid NSE symbol, positive quantity, and average cost."); return; }
                setPortfolio(current => [...current, parsed[0]]);
                setAddingHolding(false); setNewHolding({ symbol: "", qty: "", cost: "" });

              }}>
              Add Holding
            </button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 8, animation: "fade-in 0.3s ease" }}>
              {msg.role === "ai" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--gold), #ff8c00)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900, color: "#000",
                  }}>AI</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>ET Markets AI</span>
                </div>
              )}

              {/* Thinking steps */}
              {msg.isThinking && msg.steps && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 18px", maxWidth: "80%" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontStyle: "italic" }}>🤔 Analyzing...</div>
                  {msg.steps.map((step, si) => (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: si < msg.steps!.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <span style={{ color: "var(--green)", fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{step}</span>
                    </div>
                  ))}
                  {isTyping && (
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {[0, 1, 2].map((d) => (
                        <div key={d} style={{
                          width: 6, height: 6, borderRadius: "50%", background: "var(--gold)",
                          animation: `pulse 1.2s ${d * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI response */}
              {msg.role === "ai" && !msg.isThinking && msg.content && (
                <div className="chat-bubble ai" style={{ maxWidth: "80%" }}>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>{renderContent(msg.content)}</div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}>Sources:</span>
                      {msg.sources.map((s) => (
                        <span key={s} className="source-chip">📄 {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User bubble */}
              {msg.role === "user" && (
                <div className="chat-bubble user">{msg.content}</div>
              )}

              {/* Suggestions */}
              {msg.suggestions && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {msg.suggestions.map((s) => (
                    <button key={s} className="suggestion-pill" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick queries */}
        {messages.length <= 2 && (
          <div style={{ padding: "0 28px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_QUERIES.map((q) => (
              <button key={q} className="suggestion-pill" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: "16px 28px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}>
          <input
            className="input"
            placeholder="Ask about stocks, your portfolio, sectors, technical levels..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isTyping) sendMessage(input); }}
            disabled={isTyping}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage(input)}
            disabled={isTyping || !input.trim()}
            style={{ flexShrink: 0, padding: "10px 20px" }}
          >
            {isTyping ? "⏳" : "Send"}
          </button>
        </div>
      </div>

      {/* Sources panel (right) */}
      <div style={{
        width: 240, flexShrink: 0, borderLeft: "1px solid var(--border-subtle)",
        padding: 20, background: "var(--bg-secondary)", overflowY: "auto",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
          📚 Data Sources
        </div>
        {[
          { name: "Yahoo Finance", status: `${totals.priced} holding quotes available`, color: "var(--green)" },
          { name: "Your holdings", status: "Stored in this browser", color: "var(--gold)" },

        ].map((s, i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: s.color }}>{s.status}</div>
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            🧠 AI Capabilities
          </div>
          {[
            "Streaming markdown responses",
            "Portfolio-aware personalization",
            "Sources identify supplied context",
            "Real-time data integration",
            "NSE holding quote lookup",
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--green)" }}>✓</span> {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
