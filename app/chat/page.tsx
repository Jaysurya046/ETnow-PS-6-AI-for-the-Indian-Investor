"use client";
import { useState, useRef, useEffect } from "react";

interface PortfolioItem {
  symbol: string;
  qty: number;
  avgCost: number;
  cmp: number;
}

interface Message {
  role: "user" | "ai";
  content: string;
  steps?: string[];
  sources?: string[];
  suggestions?: string[];
  isThinking?: boolean;
}

const PORTFOLIO: PortfolioItem[] = [
  { symbol: "ONGC", qty: 240, avgCost: 280, cmp: 285 },
  { symbol: "HDFCNEXT50", qty: 290, avgCost: 63, cmp: 65 },
  { symbol: "POWERGRID", qty: 330, avgCost: 90, cmp: 92 },
  { symbol: "MOSMALL250", qty: 2100, avgCost: 15, cmp: 15 },
  { symbol: "TATAGOLD", qty: 3800, avgCost: 13, cmp: 14 },
];

const AI_RESPONSES: Record<string, { content: string; steps: string[]; sources: string[]; suggestions: string[] }> = {
  default: {
    content: `Based on your portfolio analysis and current market conditions, here's my assessment:

**Portfolio Health**: Your portfolio is up **₹1,93,450 (12.4%)** overall. Key winners are TCS (+9.9%), ZOMATO (+18.4%), and BAJFINANCE (+22.3%). HDFC Bank is your only underwater position (-6.3%).

**Market Context**: Nifty is in a mild uptrend. FII flows turned positive this week (+₹2,842Cr), which typically provides a 3–5 day tailwind for large caps.

**AI Recommendation**: Consider trimming ZOMATO at current levels (approaching resistance at ₹225). Deploy proceeds into HDFC Bank to average down — the stock is fundamentally sound and trading at a 5-year P/B low.`,
    steps: [
      "Fetching your portfolio P&L from live CMP data",
      "Analyzing sector weightings & risk concentration",
      "Correlating with today's FII/DII flow data",
      "Running portfolio stress test (±8% market move)",
    ],
    sources: ["NSE Live Feed", "BSE Filings", "SEBI Bulk Deals", "RBI Policy Statement"],
    suggestions: [
      "What's the HDFC Bank thesis for next 12 months?",
      "Which of my stocks is most overvalued?",
      "What's my portfolio's beta vs Nifty?",
    ],
  },
  reliance: {
    content: `**Reliance Industries — Deep Dive Analysis**

Reliance is a conglomerate play, not a single-sector bet. Three key growth engines drive the bull case:

1. **Jio Platforms**: ARPU expansion from ₹182 to ₹200+ expected in FY26. 5G subscriber additions accelerating to 50M+.
2. **Retail (JioMart + Trends)**: Q3 revenue ₹88,000Cr, up 17% YoY. Omni-channel integration complete.
3. **New Energy**: 20GW solar giga-factory by FY27. Carbon neutrality target by 2035.

**Risks**: Petroleum segment margins compressing as crude volatility persists. Regulatory overhang on telecom pricing.

**Verdict**: BUY with 12-month target of ₹3,200. Near-term consolidation expected in ₹2,770–2,900 range.`,
    steps: [
      "Pulling Reliance Q3FY25 earnings transcript",
      "Analyzing segment-wise EBITDA decomposition",
      "Comparing P/E vs Tata Group, Adani portfolio",
      "Checking FII ownership trend (last 8 quarters)",
    ],
    sources: ["Reliance Q3 Earnings Call", "NSE Filing", "BloombergQuint", "CLSA Initiating Coverage"],
    suggestions: [
      "Compare Reliance vs ONGC for energy play",
      "What's Jio's fair value if listed separately?",
      "How does Reliance hedge crude oil risk?",
    ],
  },
  nifty: {
    content: `**Nifty 50 Outlook — March 2026**

Current reading: **22,513** · Trend: Cautiously Bullish

**Bull thesis**: 
- Budget capex boost (+₹11.1L Cr) creates cyclical tailwind for infra & PSU stocks
- Corporate earnings growing at 14% CAGR — premium to Asia ex-Japan peers is justified
- RBI rate cut cycle likely (1–2 cuts in CY2026) → positive for NBFCs & AMCs

**Bear risks**:
- Global risk-off if US Fed pivots hawkish post-CPI surprise
- India VIX at 13 is complacent — watch for spike above 18
- FII selling could accelerate if INR depreciates past 85

**AI Level Map**:
- Strong support: 21,800 / 21,200
- Resistance: 23,000 / 23,800
- 12M target (base case): 25,500`,
    steps: [
      "Pulling Nifty constituent EPS estimates for FY26",
      "Analyzing moving average structure (20/50/200 DMA)",
      "Correlating with global macro — US10Y, DXY, Hang Seng",
      "Running Elliott Wave count on weekly chart",
    ],
    sources: ["NSE Market Data", "RBI Monetary Policy Report", "IMF World Economic Outlook", "Motilal Oswal Research"],
    suggestions: [
      "Which Nifty sectors are best positioned for H1 2026?",
      "Show me the India VIX historical trend",
      "Compare Nifty valuations to S&P 500",
    ],
  },
};

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
      content: "👋 I'm your ET Markets AI. I have context on your portfolio and access to live NSE/BSE data, filings, and research. Ask me anything — I reason step by step and cite every source.",
      suggestions: QUICK_QUERIES.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: "", qty: "", cost: "", cmp: "" });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(PORTFOLIO);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalValue = portfolio.reduce((a, b) => a + b.cmp * b.qty, 0);
  const totalCost = portfolio.reduce((a, b) => a + b.avgCost * b.qty, 0);
  const pnl = totalValue - totalCost;
  const pnlPct = (pnl / totalCost) * 100;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAIResponse = (query: string) => {
    const lower = query.toLowerCase();
    if (lower.includes("reliance")) return AI_RESPONSES.reliance;
    if (lower.includes("nifty") || lower.includes("market") || lower.includes("outlook")) return AI_RESPONSES.nifty;
    return AI_RESPONSES.default;
  };

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setInput("");

    setMessages((m) => [...m, { role: "user", content: q }]);
    setMessages((m) => [...m, { role: "ai", content: "", isThinking: true }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, portfolio }),
      });
      
      const response = await res.json();
      
      if (response.error) throw new Error(response.error);

      // Simulate step-by-step thinking for UX based on actual Gemini steps
      const steps = response.steps || ["Analyzing query...", "Fetching data...", "Applying models...", "Formatting response..."];

      await new Promise((r) => setTimeout(r, 600));
      setMessages((m) => {
        const msgs = [...m];
        const last = msgs[msgs.length - 1];
        if (last.isThinking) last.steps = [steps[0]];
        return msgs;
      });

      await new Promise((r) => setTimeout(r, 600));
      setMessages((m) => {
        const msgs = [...m];
        const last = msgs[msgs.length - 1];
        if (last.steps) last.steps = steps.slice(0, 2);
        return msgs;
      });

      await new Promise((r) => setTimeout(r, 600));
      setMessages((m) => {
        const msgs = [...m];
        const last = msgs[msgs.length - 1];
        if (last.steps) last.steps = steps.slice(0, 3);
        return msgs;
      });

      await new Promise((r) => setTimeout(r, 500));
      setMessages((m) => {
        const msgs = [...m];
        const last = msgs[msgs.length - 1];
        if (last.steps) {
          last.steps = steps;
          last.isThinking = false;
          last.content = response.content || "Sorry, I couldn't process that request.";
          last.sources = response.sources || [];
          last.suggestions = response.suggestions || [];
        }
        return msgs;
      });
    } catch (err) {
      setMessages((m) => {
        const msgs = [...m];
        const last = msgs[msgs.length - 1];
        last.isThinking = false;
        last.content = "Failed to connect to AI Engine. Please try again.";
        return msgs;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Check if line is bold section title (main headers)
      if (line.startsWith("**") && line.endsWith("**")) {
        const cleanLine = line.slice(2, -2);
        // Determine if it's a main header (with emoji) or sub-header
        const isMainHeader = cleanLine.match(/^[\u{1F300}-\u{1F9FF}]/u) || cleanLine.length > 50;
        return isMainHeader ? (
          <div key={i} style={{ fontWeight: 900, color: "var(--gold)", marginTop: 16, marginBottom: 8, fontSize: 14, letterSpacing: 0.5 }}>{cleanLine}</div>
        ) : (
          <div key={i} style={{ fontWeight: 800, color: "var(--green)", marginTop: 12, marginBottom: 6, fontSize: 13 }}>{cleanLine}</div>
        );
      }
      // Bold inline text
      if (line.startsWith("**")) {
        return <div key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary); font-weight: 700;">$1</strong>') }} />;
      }
      // Bullet points and numbered lists
      if (line.startsWith("- ") || line.match(/^\d+\./)) {
        return <div key={i} style={{ paddingLeft: 16, borderLeft: "3px solid rgba(34,197,94,0.3)", margin: "6px 0", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>{line.replace(/^[-\d.]+\s/, "")}</div>;
      }
      // Empty lines
      if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
      // Regular text with inline bold formatting
      return <div key={i} style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary); font-weight: 600;">$1</strong>') }} />;
    });
  };

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
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Total P&L</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: pnl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
            {pnl >= 0 ? "+" : ""}₹{Math.abs(pnl / 1000).toFixed(1)}K
          </div>
          <div style={{ fontSize: 12, color: pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
            {pnl >= 0 ? "▲" : "▼"} {Math.abs(pnlPct).toFixed(1)}% · ₹{(totalValue / 1e5).toFixed(1)}L portfolio
          </div>
        </div>

        {/* Holdings */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {portfolio.map((h, i) => {
            const hPnl = (h.cmp - h.avgCost) * h.qty;
            const hPct = ((h.cmp - h.avgCost) / h.avgCost) * 100;
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: hPnl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
                      {hPnl >= 0 ? "+" : ""}₹{(hPnl / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Avg: ₹{h.avgCost}</span>
                    <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>CMP: ₹{h.cmp}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.qty} qty</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: hPnl >= 0 ? "var(--green)" : "var(--red)" }}>
                      {hPct >= 0 ? "+" : ""}{hPct.toFixed(1)}%
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
            <input className="input" placeholder="CMP ₹" style={{ fontSize: 12 }}
              value={newHolding.cmp} onChange={(e) => setNewHolding({ ...newHolding, cmp: e.target.value })} />
            {newHolding.qty && newHolding.cost && newHolding.cmp && (
              <div style={{ padding: "8px", background: "rgba(34,197,94,0.1)", borderRadius: "4px", fontSize: 11, color: "var(--text-secondary)" }}>
                <div>P&L: <span style={{ color: parseFloat(newHolding.cmp) >= parseFloat(newHolding.cost) ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{parseFloat(newHolding.cmp) >= parseFloat(newHolding.cost) ? "+" : ""}₹{((parseFloat(newHolding.cmp) - parseFloat(newHolding.cost)) * parseInt(newHolding.qty || "0")).toFixed(0)}</span></div>
                <div>Return: <span style={{ color: parseFloat(newHolding.cmp) >= parseFloat(newHolding.cost) ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{parseFloat(newHolding.cmp) >= parseFloat(newHolding.cost) ? "+" : ""}{(((parseFloat(newHolding.cmp) - parseFloat(newHolding.cost)) / parseFloat(newHolding.cost)) * 100).toFixed(1)}%</span></div>
              </div>
            )}
            <button className="btn btn-primary" style={{ fontSize: 11, justifyContent: "center" }}
              onClick={() => {
                if (newHolding.symbol && newHolding.qty && newHolding.cost && newHolding.cmp) {
                  const holding: PortfolioItem = {
                    symbol: newHolding.symbol.toUpperCase(),
                    qty: parseInt(newHolding.qty),
                    avgCost: parseFloat(newHolding.cost),
                    cmp: parseFloat(newHolding.cmp),
                  };
                  setPortfolio([...portfolio, holding]);
                  setAddingHolding(false);
                  setNewHolding({ symbol: "", qty: "", cost: "", cmp: "" });
                  const pnl = (parseFloat(newHolding.cmp) - parseFloat(newHolding.cost)) * parseInt(newHolding.qty);
                  const pnlPct = (((parseFloat(newHolding.cmp) - parseFloat(newHolding.cost)) / parseFloat(newHolding.cost)) * 100).toFixed(1);
                  sendMessage(`I just added ${holding.symbol} (${holding.qty} shares at ₹${holding.avgCost}, CMP ₹${holding.cmp}, P&L: ${pnl >= 0 ? "+" : ""}₹${pnl.toFixed(0)} (${pnlPct}%)) to my portfolio. Is this a good entry?`);
                }
              }}>
              Add & Analyze
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
          { name: "NSE Live Feed", status: "Live", color: "var(--green)" },
          { name: "BSE Filings", status: "Live", color: "var(--green)" },
          { name: "SEBI Bulk Deals", status: "Live", color: "var(--green)" },
          { name: "RBI Policy", status: "Updated 2h ago", color: "var(--gold)" },
          { name: "Analyst Reports", status: "38 sources", color: "var(--blue)" },
          { name: "Earnings Calls", status: "Q3FY25", color: "var(--blue)" },
          { name: "News Sentiment", status: "Live NLP", color: "var(--green)" },
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
            "Multi-step chain-of-thought reasoning",
            "Portfolio-aware personalization",
            "Source citation on every answer",
            "Real-time data integration",
            "NSE/BSE full universe coverage",
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
