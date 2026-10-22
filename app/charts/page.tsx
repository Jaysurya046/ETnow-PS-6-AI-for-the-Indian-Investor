"use client";
import { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { NIFTY_100 } from "@/lib/nifty100";
import type { CandleBar, TechnicalAnalysis } from "@/lib/indicators";
import { NIFTY50_INSIGHTS, type StockInsights } from "@/lib/nifty50Insights";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

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
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

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
      time: d.time as UTCTimestamp,
      open: d.open, high: d.high, low: d.low, close: d.close,
    }));
    const volumes = sorted.map(d => ({
      time: d.time as UTCTimestamp,
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
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insights, setInsights] = useState<StockInsights | null>(null);
  const [insightSource, setInsightSource] = useState("");
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [interval, setIntervalLabel] = useState("");

  // FIX 1: use chartKey to force CandlestickChart remount on stock/range change
  // This guarantees a fresh chart with proper fitContent each time
  const chartKey = `${selected.label}-${range}`;

  const filtered = STOCKS.filter(
    s =>
      s.label.includes(search.toUpperCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sector.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadChart() {
      setChartLoading(true);
      setChartData([]);
      setAnalysis(null);
      try {
        const res = await fetch(`/api/chart?symbol=${encodeURIComponent(selected.label)}&range=${range}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Chart unavailable");
        const data: { candles: CandleBar[]; analysis: TechnicalAnalysis; interval: string } = await res.json();
        if (!controller.signal.aborted) {
          setChartData(data.candles); setAnalysis(data.analysis); setIntervalLabel(data.interval);
        }
      } catch { /* Empty chart state explains unavailable data. */ }
      finally { if (!controller.signal.aborted) setChartLoading(false); }
    }
    async function loadInsights() {
      setInsightsLoading(true); setInsights(null); setInsightSource("");
      try {
        const res = await fetch(`/api/chart-insights?symbol=${encodeURIComponent(selected.label)}&range=${range}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Insights unavailable");
        const data: { technicalInsights: string[]; quantitativeInsights: string[] } = await res.json();
        if (!controller.signal.aborted) {
          setInsights({ technical: data.technicalInsights, quantitative: data.quantitativeInsights }); setInsightSource("AI summary of measured data");
        }
      } catch {
        if (!controller.signal.aborted) {
          setInsights(NIFTY50_INSIGHTS[selected.label] ?? null); setInsightSource("Offline reference — historical, not current analysis");
        }
      } finally { if (!controller.signal.aborted) setInsightsLoading(false); }
    }
    void loadChart(); void loadInsights();
    const refresh = window.setInterval(() => { void loadChart(); void loadInsights(); }, 60_000);
    return () => { controller.abort(); window.clearInterval(refresh); };
  }, [selected.label, range]);
  const stockInsights = insights;

  const last  = chartData[chartData.length - 1];
  const first = chartData[0];
  const pctChange = last && first ? ((last.close - first.open) / first.open * 100).toFixed(2) : "0.00";
  const isUp  = last && first ? last.close >= first.open : true;

  const level = (v: number | null | undefined) => v == null ? "Unavailable" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const pattern = analysis ? {
    name: analysis.patterns.join(" · ") || "No qualifying pattern",
    type: `${analysis.sentiment} trend`, sentiment: analysis.sentiment,
    description: `Calculated from ${analysis.bars} ${interval} bars including warm-up history. Patterns are rule-based observations.`,
    entryZone: "No entry recommendation", stopLoss: "Not calculated", target: "Not calculated",
    recommendation: "Review measured indicators and previous-bar pivot levels. No backtest win rate is available.",
  } : null;

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
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.color || "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {insightsLoading && <p style={{ color: "var(--text-muted)" }}>Loading live insights…</p>}
          {analysis && (
            <div className="card">
              <h3>Measured indicators · {interval} bars</h3>
              <p>RSI (14): {analysis.rsi?.toFixed(2) ?? "Insufficient history"}</p>
              <p>{([9, 21, 50, 200] as const).map(period => `EMA ${period}: ${level(analysis.ema[period])}`).join(" · ")}</p>
              <p>MACD (12,26,9): {analysis.macd.value?.toFixed(2) ?? "Unavailable"} · Signal: {analysis.macd.signal?.toFixed(2) ?? "Unavailable"} · Histogram: {analysis.macd.histogram?.toFixed(2) ?? "Unavailable"}</p>
              <p>Projected levels from the previous {interval} bar</p>
              {analysis.pivots && Object.entries(analysis.pivots).map(([name, p]) => <p key={name}>{name}: P {level(p.pivot)} · S1 {level(p.s1)} · S2 {level(p.s2)} · S3 {level(p.s3)} · R1 {level(p.r1)} · R2 {level(p.r2)} · R3 {level(p.r3)}</p>)}
            </div>
          )}
          {stockInsights && (
          <div className="card animate-fade-in" style={{ border: "1px solid rgba(240,180,41,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                📊 Stock Analysis — {selected.label} · {insightSource}
              </div>

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

          {/* Algorithmic patterns based on fetched candles */}
          <div className="card animate-glow" style={{ borderColor: "rgba(168,85,247,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                📐 Calculated Patterns
              </div>
              <span className="pattern-badge">◆ {selected.label}</span>
            </div>

            {chartLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[80, 40, 100, 60, 60].map((w, i) => (
                  <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}

            {!chartLoading && pattern && (
              <>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{pattern.name}</div>
                <div style={{ fontSize: 12, color: typeColor(pattern.type), fontWeight: 600, marginBottom: 14 }}>{pattern.type}</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>{pattern.description}</p>

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

            {!chartLoading && !pattern && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                Pattern analysis unavailable — market candles could not be loaded.
              </div>
            )}
          </div>

          {/* Measured trend summary */}
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
                <div className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>Pattern</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textAlign: "right", maxWidth: 140 }}>{pattern.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Type</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: typeColor(pattern.type), textAlign: "right", maxWidth: 140 }}>{pattern.type}</span>
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
