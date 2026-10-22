"use client";
import { useState, useEffect } from "react";
import { NIFTY_100 } from "@/lib/nifty100";

type SignalType = "BUY" | "SELL" | "WATCH" | "INSIDER" | "ALERT";

interface Signal {
  id: number;
  stock: string;
  fullName: string;
  sector: string;
  cap: string;
  type: SignalType;
  event: string;
  reasoning: string;
  confidence: number;
  price: string;
  target: string;
  timeAgo: string;
  tags: string[];
}

const SECTORS = ["All", ...new Set(NIFTY_100.map(stock => stock.sector))];
const SIGNAL_TYPES: Array<"All" | SignalType> = ["All", "BUY", "SELL", "WATCH", "INSIDER", "ALERT"];
const CAP_SIZES = ["All", "Large", "Mid", "Small"];

function signalClass(type: SignalType) {
  if (type === "BUY" || type === "INSIDER") return "signal-buy";
  if (type === "SELL") return "signal-sell";
  if (type === "WATCH") return "signal-watch";
  return "signal-sell";
}

function badgeClass(type: SignalType) {
  if (type === "BUY") return "badge-buy";
  if (type === "SELL") return "badge-sell";
  if (type === "WATCH") return "badge-watch";
  if (type === "INSIDER") return "badge-insider";
  return "badge-alert";
}

function confidenceColor(c: number) {
  if (c >= 80) return "var(--green)";
  if (c >= 65) return "var(--gold)";
  return "var(--red)";
}

export default function RadarPage() {
  const [signalsList, setSignalsList] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/radar");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSignalsList(data);
        }
      } catch (err) {
        console.error("Failed to load live radar signals", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, []);

  const [sector, setSector] = useState("All");
  const [sigType, setSigType] = useState<"All" | SignalType>("All");
  const [cap, setCap] = useState("All");
  const filtered = signalsList.filter((s) => {
    if (sector !== "All" && s.sector !== sector) return false;
    if (sigType !== "All" && s.type !== sigType) return false;
    if (cap !== "All" && s.cap !== cap) return false;
    return true;
  });

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <span>📡</span> Opportunity Radar
          <span className="live-badge" style={{ fontSize: 11, padding: "3px 10px", marginLeft: 8 }}>
            <span className="live-dot" /> {loading ? "LOADING" : "LATEST QUOTES"}
          </span>
        </div>
        <div className="page-subtitle">
          Price momentum signals based on supplied market quotes
        </div>
      </div>

      {/* Marquee of latest signals */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "10px 0",
        marginBottom: 24,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, animation: "ticker-slide 20s linear infinite", whiteSpace: "nowrap" }}>
          {[...signalsList, ...signalsList].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 20px", borderRight: "1px solid var(--border-subtle)", fontSize: 12 }}>
              <span className={`badge badge-${s.type === "BUY" || s.type === "INSIDER" ? "buy" : s.type === "SELL" ? "sell" : s.type === "WATCH" ? "watch" : "alert"}`}>
                {s.type}
              </span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{s.stock}</span>
              <span style={{ color: "var(--text-secondary)" }}>{s.event.slice(0, 28)}…</span>
              <span style={{ color: "var(--text-muted)" }}>{s.timeAgo}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
        {/* Filter Panel */}
        <div>
          {/* Stats */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
              Today&apos;s Stats
            </div>
            {[
              { label: "Total Signals", val: `${signalsList.length}`, color: "var(--text-primary)" },
              { label: "BUY Signals", val: `${signalsList.filter(s => s.type === "BUY").length}`, color: "var(--green)" },
              { label: "SELL Signals", val: `${signalsList.filter(s => s.type === "SELL").length}`, color: "var(--red)" },
              { label: "WATCH Alerts", val: `${signalsList.filter(s => s.type === "WATCH").length}`, color: "var(--gold)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? "1px solid var(--border-subtle)" : "none" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
              Filters
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Signal Type</div>
              {SIGNAL_TYPES.map((t) => (
                <button key={t}
                  onClick={() => setSigType(t)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 10px", marginBottom: 4,
                    borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                    background: sigType === t ? "var(--gold-dim)" : "transparent",
                    color: sigType === t ? "var(--gold)" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}>
                  {t}
                </button>
              ))}
            </div>

            <div className="divider" />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Sector</div>
              <select className="input" value={sector} onChange={(e) => setSector(e.target.value)} style={{ fontSize: 12 }}>
                {SECTORS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Market Cap</div>
              {CAP_SIZES.map((c) => (
                <button key={c}
                  onClick={() => setCap(c)}
                  style={{
                    display: "inline-block", marginRight: 6, marginBottom: 6,
                    padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    background: cap === c ? "var(--gold-dim)" : "rgba(255,255,255,0.04)",
                    color: cap === c ? "var(--gold)" : "var(--text-muted)",
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Signal Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No signals available for these filters. Market data may be unavailable.
            </div>
          )}
          {filtered.map((signal, i) => (
            <div
              key={signal.id}
              className={`signal-card ${signalClass(signal.type)} animate-fade-in`}
              style={{
                animationDelay: `${i * 60}ms`,

                transition: "outline 0.3s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>
                        {signal.stock}
                      </span>
                      <span className={`badge ${badgeClass(signal.type)}`}>{signal.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{signal.fullName} · {signal.sector}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    className="confidence-ring"
                    style={{
                      background: `${confidenceColor(signal.confidence)}1a`,
                      border: `2px solid ${confidenceColor(signal.confidence)}`,
                      color: confidenceColor(signal.confidence),
                    }}
                  >
                    {signal.confidence}/100
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>CMP</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>₹{signal.price}</div>
                  </div>
                  {signal.target !== "N/A" && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Target</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>₹{signal.target}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)",
                padding: "10px 12px", marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, letterSpacing: 0.5 }}>
                  🔔 {signal.event}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{signal.reasoning}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {signal.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{signal.timeAgo}</span>
                  <button className="btn btn-green" style={{ padding: "5px 12px", fontSize: 11 }}>+ Track</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
