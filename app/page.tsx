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
      "Corporate filings, insider trades, bulk deals — scanned continuously. Get actionable buy/sell/watch signals before the crowd.",
    color: "var(--green)",
    colorDim: "var(--green-dim)",
    colorBorder: "rgba(34,197,94,0.2)",
    stats: [
      { label: "Signals today", value: "247" },
      { label: "Win rate", value: "78%" },
    ],
    badge: "LIVE",
  },
  {
    href: "/charts",
    icon: "📈",
    title: "Chart Pattern Intelligence",
    subtitle: "AI Pattern Detector",
    description:
      "Real-time breakout, reversal & S/R detection across the entire NSE universe — with back-tested success rates & plain-English explanations.",
    color: "var(--purple)",
    colorDim: "var(--purple-dim)",
    colorBorder: "rgba(168,85,247,0.2)",
    stats: [
      { label: "Patterns scanned", value: "4,800+" },
      { label: "Avg accuracy", value: "72%" },
    ],
    badge: "NSE FULL",
  },
  {
    href: "/chat",
    icon: "🤖",
    title: "Market ChatGPT — Next Gen",
    subtitle: "Portfolio-Aware AI",
    description:
      "Ask anything about any stock, sector, or your portfolio. Multi-step analysis, source-cited answers, deeper data integration.",
    color: "var(--gold)",
    colorDim: "var(--gold-dim)",
    colorBorder: "rgba(240,180,41,0.2)",
    stats: [
      { label: "Data sources", value: "38" },
      { label: "Avg response", value: "1.4s" },
    ],
    badge: "AI POWERED",
  },
  {
    href: "/video",
    icon: "🎬",
    title: "AI Market Video Engine",
    subtitle: "Zero-Edit Automation",
    description:
      "Auto-generate visually rich 30–90s market wrap videos: race charts, FII/DII flows, sector rotation & IPO trackers — no editor needed.",
    color: "var(--orange)",
    colorDim: "var(--orange-dim)",
    colorBorder: "rgba(249,115,22,0.2)",
    stats: [
      { label: "Videos today", value: "12" },
      { label: "Avg duration", value: "47s" },
    ],
    badge: "AUTO-GEN",
  },
];

const MARKET_STATS = [
  { label: "NIFTY 50", value: "22,513", change: "+0.64%", up: true },
  { label: "SENSEX", value: "74,119", change: "+0.66%", up: true },
  { label: "FII Net", value: "+₹2,842Cr", change: "Today", up: true },
  { label: "DII Net", value: "-₹438Cr", change: "Today", up: false },
  { label: "India VIX", value: "13.42", change: "-1.2%", up: false },
  { label: "Advance/Decline", value: "1,847/812", change: "NSE", up: true },
];

function AnimatedNumber({ target }: { target: string }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    // Simple typewriter-style reveal
    let start = 0;
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) { setDisplay(target); return; }
    const steps = 30;
    const step = numeric / steps;
    const timer = setInterval(() => {
      start += step;
      if (start >= numeric) { setDisplay(target); clearInterval(timer); }
      else {
        const prefix = target.replace(/[\d.,]+/, "");
        setDisplay(prefix.startsWith("₹") || prefix.startsWith("+₹") ? `${prefix}${Math.floor(start).toLocaleString("en-IN")}${target.slice(-2)}` : Math.floor(start).toLocaleString() );
      }
    }, 30);
    return () => clearInterval(timer);
  }, [target]);

  return <>{display}</>;
}

export default function HomePage() {
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
            <div className="badge badge-buy">🟢 MARKET OPEN</div>
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
        {MARKET_STATS.map((s, i) => (
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
