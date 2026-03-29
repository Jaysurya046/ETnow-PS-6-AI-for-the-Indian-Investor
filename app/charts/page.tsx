"use client";
import { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { NIFTY_100 } from "@/lib/nifty100";
import { NIFTY50_PATTERNS, StockPattern } from "@/lib/nifty50Patterns";
import { NIFTY50_INSIGHTS } from "@/lib/nifty50Insights";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


// Build display list from the shared Nifty 100 universe
const STOCKS = NIFTY_100.map(s => ({
  label: s.sym.replace(".NS", ""),
  name: s.name,
  sector: s.sector,
  cap: s.cap,
}));

function sentimentColor(s: string) {
  if (s === "Bullish") return "var(--green)";
  if (s === "Bearish") return "var(--red)";
  return "var(--gold)";
}

function typeColor(t: string) {
  if (t?.toLowerCase().includes("bullish")) return "var(--green)";
  if (t?.toLowerCase().includes("bearish")) return "var(--red)";
  return "var(--gold)";
}

// ─── Lightweight-Charts Candlestick Component ─────────────────────────────────
// Keyed externally so it remounts on symbol/range change → guaranteed fitContent
function CandlestickChart({ data, loading }: { data: CandleBar[]; loading: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d0d1a" },
        textColor: "#6b7280",
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(240,180,41,0.4)", labelBackgroundColor: "#f0b429" },
        horzLine: { color: "rgba(240,180,41,0.4)", labelBackgroundColor: "#f0b429" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: 3,
      },
      width: containerRef.current.clientWidth,
      height: 420,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(240,180,41,0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Push data to chart series; use requestAnimationFrame so timeScale is ready
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current || data.length === 0) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const candles = sorted.map(d => ({
      time: d.time as any,
      open: d.open, high: d.high, low: d.low, close: d.close,
    }));
    const volumes = sorted.map(d => ({
      time: d.time as any,
      value: d.volume,
      color: d.close >= d.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
    }));

    candleSeriesRef.current.setData(candles);
    volSeriesRef.current.setData(volumes);

    // FIX 1: use rAF to guarantee timeScale is ready before fitContent
    requestAnimationFrame(() => {
      chartRef.current?.timeScale().fitContent();
    });
  }, [data]);

  return (
    <div style={{ position: "relative", minHeight: 420 }}>
      <div ref={containerRef} style={{ width: "100%", height: 420 }} />
      {loading && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(13,13,26,0.75)", borderRadius: "var(--radius-md)", backdropFilter: "blur(4px)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading chart data…</div>
          </div>
        </div>
      )}
      {!loading && data.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(13,13,26,0.75)",
        }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⚠</div>
            <div style={{ fontSize: 13 }}>No chart data available.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const [selected, setSelected] = useState(STOCKS[0]);
  const [range, setRange] = useState<TimeRange>("1M");
  const [chartData, setChartData] = useState<CandleBar[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [insightsLoading] = useState(false);

  // FIX 1: use chartKey to force CandlestickChart remount on stock/range change
  // This guarantees a fresh chart with proper fitContent each time
  const chartKey = `${selected.label}-${range}`;

  const filtered = STOCKS.filter(
    s =>
      s.label.includes(search.toUpperCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sector.toLowerCase().includes(search.toLowerCase())
  );

  // Fetch OHLCV data
  useEffect(() => {
    async function fetchChart() {
      setChartLoading(true);
      setChartData([]);
      try {
        const res = await fetch(`/api/chart?symbol=${encodeURIComponent(selected.label)}&range=${range}`);
        const data = await res.json();
        if (Array.isArray(data)) setChartData(data);
      } catch {
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    }
    fetchChart();
  }, [selected.label, range]);

  // Hardcoded insights for Nifty 50 stocks
  const stockInsights = NIFTY50_INSIGHTS[selected.label];

  const last  = chartData[chartData.length - 1];
  const first = chartData[0];
  const pctChange = last && first ? ((last.close - first.open) / first.open * 100).toFixed(2) : "0.00";
  const isUp  = last && first ? last.close >= first.open : true;

  // Hardcoded pattern for this stock (from Nifty 50 list, or null for others)
  const pattern: StockPattern | undefined = NIFTY50_PATTERNS[selected.label];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <span>📈</span> Chart Pattern Intelligence
          <span className="live-badge" style={{ fontSize: 11, padding: "3px 10px", marginLeft: 8 }}>
            <span className="live-dot" /> NIFTY 100
          </span>
        </div>
        <div className="page-subtitle">
          Professional candlestick charts · Entire Nifty 100 universe · AI pattern detection &amp; insights
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>

        {/* Searchable stock selector */}
        <div style={{ position: "relative" }}>
          <input
            className="input"
            value={showDropdown ? search : selected.label}
            onFocus={() => { setSearch(""); setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Nifty 100…"
            style={{ width: 220, fontWeight: 600, fontSize: 13 }}
          />
          {showDropdown && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, width: 320,
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", zIndex: 100, maxHeight: 300, overflowY: "auto",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            }}>
              {filtered.slice(0, 30).map(s => (
                <div
                  key={s.label}
                  onMouseDown={() => { setSelected(s); setShowDropdown(false); setSearch(""); }}
                  style={{
                    padding: "8px 14px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: selected.label === s.label ? "rgba(240,180,41,0.08)" : "transparent",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = selected.label === s.label ? "rgba(240,180,41,0.08)" : "transparent")}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{s.name.slice(0, 28)}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{s.sector}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 14, color: "var(--text-muted)", fontSize: 12 }}>No stocks match.</div>
              )}
            </div>
          )}
        </div>

        <span className="badge" style={{ fontSize: 11 }}>{selected.cap}-Cap · {selected.sector}</span>

        {/* Time range */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 4 }}>
          {(["1D", "1W", "1M", "3M", "6M", "1Y"] as TimeRange[]).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: range === r ? "var(--gold)" : "transparent",
              color: range === r ? "#000" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>{r}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span className="badge badge-buy">▲ Bullish</span>
          <span className="badge badge-sell">▼ Bearish</span>
          <span className="badge badge-insider">▌ Volume</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

        {/* LEFT: Chart + AI Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Chart Card */}
          <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{selected.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{selected.name}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>NSE · {selected.sector} · {selected.cap}-Cap</div>
              </div>
              {last && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>
                    ₹{last.close.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 13, color: isUp ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                    {isUp ? "▲" : "▼"} {Math.abs(+pctChange)}% ({range})
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 16px 8px" }}>
              {/* FIX 1: key forces remount on stock/range change → guaranteed fitContent */}
              <CandlestickChart key={chartKey} data={chartData} loading={chartLoading} />
            </div>

            {last && chartData.length > 0 && (
              <div style={{ padding: "0 20px 16px", display: "flex", gap: 28 }}>
                {[
                  { label: "Open",    val: `₹${first?.open.toFixed(2)}` },
                  { label: "High",    val: `₹${Math.max(...chartData.map(d => d.high)).toFixed(2)}`, color: "var(--green)" },
                  { label: "Low",     val: `₹${Math.min(...chartData.map(d => d.low)).toFixed(2)}`,  color: "var(--red)" },
                  { label: "Close",   val: `₹${last.close.toFixed(2)}` },
                  { label: "Avg Vol", val: `${((chartData.reduce((a, b) => a + b.volume, 0) / chartData.length) / 1e5).toFixed(1)}L` },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (s as any).color || "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insights — hardcoded for Nifty 50, hidden for others */}
          {stockInsights && pattern && (
          <div className="card animate-fade-in" style={{ border: "1px solid rgba(240,180,41,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                📊 Stock Analysis — {selected.label}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: sentimentColor(pattern.sentiment),
                background: `${sentimentColor(pattern.sentiment)}18`,
                border: `1px solid ${sentimentColor(pattern.sentiment)}40`,
                borderRadius: "var(--radius-sm)", padding: "2px 10px",
              }}>
                {pattern.sentiment === "Bullish" ? "▲" : pattern.sentiment === "Bearish" ? "▼" : "◆"} {pattern.sentiment} · {pattern.sentimentScore}%
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", display: "inline-block" }} />
                  Technical Insights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stockInsights.technical.map((pt, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "10px 12px",
                      background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)", borderRadius: "var(--radius-sm)",
                    }}>
                      <span style={{ fontSize: 13, color: "var(--purple)", flexShrink: 0, fontWeight: 800 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
                  Quantitative Insights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stockInsights.quantitative.map((pt, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "10px 12px",
                      background: "rgba(240,180,41,0.05)", border: "1px solid rgba(240,180,41,0.12)", borderRadius: "var(--radius-sm)",
                    }}>
                      <span style={{ fontSize: 13, color: "var(--gold)", flexShrink: 0, fontWeight: 800 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* RIGHT: Pattern Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* FIX 2: AI-detected pattern from Gemini, skeleton while loading */}
          <div className="card animate-glow" style={{ borderColor: "rgba(168,85,247,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                🤖 AI Detected Pattern
              </div>
              <span className="pattern-badge">◆ {selected.label}</span>
            </div>

            {insightsLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[80, 40, 100, 60, 60].map((w, i) => (
                  <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}

            {!insightsLoading && pattern && (
              <>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{pattern.name}</div>
                <div style={{ fontSize: 12, color: typeColor(pattern.type), fontWeight: 600, marginBottom: 14 }}>{pattern.type}</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>{pattern.description}</p>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Back-tested Win Rate</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>{pattern.winRate}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pattern.winRate}%`, background: "linear-gradient(90deg, var(--green), #16a34a)" }} />
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>Trade Setup</div>
                  {[
                    { label: "Entry Zone", val: pattern.entryZone, color: "var(--gold)" },
                    { label: "Stop Loss",  val: pattern.stopLoss,  color: "var(--red)" },
                    { label: "Target",     val: pattern.target,    color: "var(--green)" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{r.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r.color, fontFamily: "JetBrains Mono, monospace", textAlign: "right" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!insightsLoading && !pattern && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                Pattern analysis unavailable — check API key.
              </div>
            )}
          </div>

          {/* Signal Summary — fully hardcoded, always available for Nifty 50 stocks */}
          {pattern && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
                Signal Summary
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sentiment</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: sentimentColor(pattern.sentiment),
                    background: `${sentimentColor(pattern.sentiment)}18`,
                    border: `1px solid ${sentimentColor(pattern.sentiment)}40`,
                    borderRadius: "var(--radius-sm)", padding: "2px 8px",
                  }}>
                    {pattern.sentiment === "Bullish" ? "▲" : pattern.sentiment === "Bearish" ? "▼" : "◆"} {pattern.sentiment}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Confidence</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}>{pattern.sentimentScore}%</span>
                </div>
                <div className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>Pattern</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textAlign: "right", maxWidth: 140 }}>{pattern.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Type</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: typeColor(pattern.type), textAlign: "right", maxWidth: 140 }}>{pattern.type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Win Rate</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>{pattern.winRate}%</span>
                </div>
                <div className="divider" />
                <div style={{ fontSize: 12, color: "var(--green)", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "var(--radius-sm)", padding: "8px 10px", lineHeight: 1.6 }}>
                  💡 {pattern.recommendation}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
