"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const MODULES = [
  {
    href: "/radar",
    icon: "📡",
    title: "Opportunity Radar",
    subtitle: "AI Signal Finder",
    description:
      "Observed price momentum across the configured NIFTY 100 universe, with quote timestamps and concise analysis.",
    color: "var(--green)",
    colorDim: "var(--green-dim)",
    colorBorder: "rgba(34,197,94,0.2)",
    stats: [
      { label: "Stock universe", value: "100" },
      { label: "Signal basis", value: "Price" },
    ],
    badge: "LIVE",
  },
  {
    href: "/charts",
    icon: "📈",
    title: "Chart Pattern Intelligence",
    subtitle: "AI Pattern Detector",
    description:
      "Measured RSI, EMAs, MACD, candle patterns and pivot levels across NIFTY 100, with plain-English insights.",
    color: "var(--purple)",
    colorDim: "var(--purple-dim)",
    colorBorder: "rgba(168,85,247,0.2)",
    stats: [
      { label: "EMA periods", value: "4" },
      { label: "Pivot methods", value: "3" },
    ],
    badge: "NIFTY 100",
  },
  {
    href: "/chat",
    icon: "🤖",
    title: "Market ChatGPT — Next Gen",
    subtitle: "Portfolio-Aware AI",
    description:
      "Save holdings in this browser, track P&L from available quotes, and ask portfolio questions with streaming answers.",
    color: "var(--gold)",
    colorDim: "var(--gold-dim)",
    colorBorder: "rgba(240,180,41,0.2)",
    stats: [
      { label: "Holdings", value: "Saved" },
      { label: "Responses", value: "Streaming" },
    ],
    badge: "AI POWERED",
  },
  {
    href: "/video",
    icon: "🎬",
    title: "AI Market Video Engine",
    subtitle: "Market Script Preview",
    description:
      "Generate factual market script previews from quote data, with live sector indices and ranked daily gainers and losers.",
    color: "var(--orange)",
    colorDim: "var(--orange-dim)",
    colorBorder: "rgba(249,115,22,0.2)",
    stats: [
      { label: "Sector indices", value: "8" },
      { label: "Mover universe", value: "100" },
    ],
    badge: "AUTO-GEN",
  },
];

interface MarketStat { name: string; price: string; pct: string; up: boolean }
const SNAPSHOT_NAMES = ["NIFTY 50", "SENSEX", "USD/INR"];

export default function HomePage() {
  const [market, setMarket] = useState<MarketStat[]>([]);
  const [marketError, setMarketError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const res = await fetch("/api/market", { signal: controller.signal });
        if (!res.ok) throw new Error("Market unavailable");
        const data: MarketStat[] = await res.json();
        if (!controller.signal.aborted) { setMarket(data); setMarketError(false); }
      } catch { if (!controller.signal.aborted) setMarketError(true); }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  const marketStats = SNAPSHOT_NAMES.map(name => {
    const quote = market.find(q => q.name === name);
    return { label: name, value: quote?.price ?? "Unavailable", change: marketError ? "Update unavailable" : quote?.pct ?? "Loading", up: quote?.up ?? true };
  });
  return (
    <div className="page">
      {/* Hero */}
      <div style={{ marginBottom: 40, position: "relative" }}>
        <div style={{
          position: "absolute", top: -40, left: -28, right: -28,
          height: 320,
          background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(240,180,41,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }} className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className="badge badge-buy">LATEST MARKET SNAPSHOT</div>
            <div className="badge badge-alert">NSE · BSE · MCX</div>
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1.1,
            marginBottom: 16,
            background: "linear-gradient(135deg, #fff 0%, var(--gold) 60%, #ff8c00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            AI Intelligence<br />for the Indian Market
          </h1>

          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 580, lineHeight: 1.7, marginBottom: 28 }}>
            14 crore+ demat accounts. Most flying blind. ETNow AI turns raw market data into
            actionable signals, pattern intelligence, and plain-English analysis — in real time.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/radar" className="btn btn-primary" style={{ fontSize: 14, padding: "12px 24px" }}>
              🚀 Launch Opportunity Radar
            </Link>
            <Link href="/chat" className="btn btn-ghost" style={{ fontSize: 14, padding: "12px 24px" }}>
              💬 Ask Market ChatGPT
            </Link>
          </div>
        </div>
      </div>

      {/* Market Stats Bar */}
      <div className="grid-3" style={{ gridTemplateColumns: "repeat(6,1fr)", marginBottom: 40, gap: 12 }}>
        {marketStats.map((s, i) => (
          <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
            <div className="stat-change" style={{ color: s.up ? "var(--green)" : "var(--red)" }}>
              {s.up ? "▲" : "▼"} {s.change}
            </div>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 }}>
          AI Modules
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {MODULES.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card animate-fade-in"
                style={{
                  animationDelay: `${i * 80}ms`,
                  border: `1px solid ${m.colorBorder}`,
                  position: "relative",
                  overflow: "hidden",
                  padding: 28,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${m.colorDim}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Glow corner */}
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  width: 180, height: 180,
                  background: `radial-gradient(circle at top right, ${m.colorDim}, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: m.colorDim,
                    border: `1px solid ${m.colorBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24,
                  }}>
                    {m.icon}
                  </div>
                  <span className="badge" style={{
                    background: m.colorDim,
                    color: m.color,
                    border: `1px solid ${m.colorBorder}`,
                  }}>
                    {m.badge}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  {m.subtitle}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.3px" }}>
                  {m.title}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                  {m.description}
                </p>

                <div style={{ display: "flex", gap: 24 }}>
                  {m.stats.map((s, j) => (
                    <div key={j}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: m.color, fontFamily: "JetBrains Mono, monospace" }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer tagline */}
      <div style={{ marginTop: 48, textAlign: "center", paddingBottom: 40 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Powered by real-time NSE/BSE data feeds · Built for India&apos;s 14Cr+ retail investors
        </p>
      </div>
    </div>
  );
}
