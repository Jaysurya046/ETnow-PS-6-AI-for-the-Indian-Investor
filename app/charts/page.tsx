"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useSearchParams } from "next/navigation";
import { PageHeading, PanelHeading, EmptyState, inr } from "@/components/Terminal";
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

    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string) => tokens.getPropertyValue(name).trim();
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: token("--bg-secondary") },
        textColor: token("--text-muted"),
        fontFamily: "IBM Plex Mono, Consolas, monospace",
      },
      grid: {
        vertLines: { color: token("--bg-subtle") },
        horzLines: { color: token("--bg-subtle") },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: token("--border-strong"), labelBackgroundColor: token("--gold") },
        horzLine: { color: token("--border-strong"), labelBackgroundColor: token("--gold") },
      },
      rightPriceScale: {
        borderColor: token("--border-subtle"),
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: token("--border-subtle"),
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: 3,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: token("--green"),
      downColor: token("--red"),
      borderUpColor: token("--green"),
      borderDownColor: token("--red"),
      wickUpColor: token("--green"),
      wickDownColor: token("--red"),
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: token("--text-muted"),
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current) return;
    const colors = getComputedStyle(document.documentElement);
    const sorted = [...data].sort((a,b) => a.time-b.time);
    candleSeriesRef.current.setData(sorted.map(c => ({ time:c.time as UTCTimestamp, open:c.open, high:c.high, low:c.low, close:c.close })));
    volSeriesRef.current.setData(sorted.map(c => ({ time:c.time as UTCTimestamp, value:c.volume, color:colors.getPropertyValue(c.close >= c.open ? "--volume-up" : "--volume-down").trim() })));
    const frame = requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
    return () => cancelAnimationFrame(frame);
  }, [data]);

  return <div className="chart-canvas" role="img" aria-label="Price candlestick chart with volume. Open, high, low, close and indicators are provided in the surrounding tables.">
    <div className="canvas-target" ref={containerRef} />
    {loading && <div className="chart-overlay" role="status">Loading candles…</div>}
    {!loading && data.length === 0 && <div className="chart-overlay" role="status">Chart data unavailable.</div>}
  </div>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ChartsWorkspace({ initialSymbol }: { initialSymbol: string }) {
  const [selected, setSelected] = useState(STOCKS.find(s => s.label === initialSymbol) ?? STOCKS[0]);
  const [range, setRange] = useState<TimeRange>("1M");
  const [chartData, setChartData] = useState<CandleBar[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insights, setInsights] = useState<StockInsights | null>(null);
  const [insightSource, setInsightSource] = useState("");
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [interval, setIntervalLabel] = useState("");

  // FIX 1: use chartKey to force CandlestickChart remount on stock/range change
  // This guarantees a fresh chart with proper fitContent each time
  const chartKey = `${selected.label}-${range}`;

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

  const level = (value: number | null | undefined) => inr(value ?? null);
  const sentimentClass = analysis?.sentiment === "Bullish" ? "positive" : analysis?.sentiment === "Bearish" ? "negative" : "muted";
  return <div className="page charts-page">
    <PageHeading index="03" title="Chart analysis" description="Price structure, momentum and measured technical indicators."><span className="label-tag">NIFTY 100</span></PageHeading>
    <div className="panel chart-toolbar"><div className="toolbar">
      <label className="filter-field">Instrument<select className="input numeric" aria-label="Chart instrument" value={selected.label} onChange={e => setSelected(STOCKS.find(s => s.label === e.target.value)!)}>{STOCKS.map(s => <option key={s.label} value={s.label}>{s.label} — {s.name}</option>)}</select></label>
      <div className="segmented" role="group" aria-label="Chart time range">{(["1D","1W","1M","3M","6M","1Y"] as TimeRange[]).map(r => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}</div>
      <span className="panel-meta">NSE · {selected.sector}</span>
    </div></div>
    <div className="chart-grid"><div className="stack">
      <section className="panel"><div className="chart-instrument"><div><h2>{selected.label}</h2><p>{selected.name}</p></div><div className="chart-price"><strong className="numeric">{last ? inr(last.close) : "—"}</strong><span className={`numeric ${isUp ? "positive" : "negative"}`}>{last ? `${isUp ? "↑" : "↓"} ${pctChange}% / ${range}` : "Awaiting candles"}</span></div></div>
        <CandlestickChart key={chartKey} data={chartData} loading={chartLoading} />
        <div className="ohlcv">{[{ label:"O", value:first?.open },{ label:"H", value:last ? Math.max(...chartData.map(c => c.high)) : undefined },{ label:"L", value:last ? Math.min(...chartData.map(c => c.low)) : undefined },{ label:"C", value:last?.close }].map(item => <span key={item.label}>{item.label}<strong className="numeric">{level(item.value)}</strong></span>)}<span>VOL<strong className="numeric">{last?.volume.toLocaleString("en-IN") ?? "—"}</strong></span></div>
        <div className="panel-footer"><span>{last ? new Date(last.time*1000).toLocaleString("en-IN", { timeZone:"Asia/Kolkata" })+" IST" : "Latest available candles"}</span><span className="numeric">{interval || "—"} interval · 60s refresh</span></div>
      </section>
      <section className="panel"><PanelHeading title="Pivot levels" meta={`Previous ${interval || "—"} bar`} /><div className="table-scroll" role="region" aria-label="Pivot levels" tabIndex={0}><table className="data-table"><thead><tr><th scope="col">Method</th>{["S3","S2","S1","Pivot","R1","R2","R3"].map(label => <th scope="col" key={label} className="num">{label}</th>)}</tr></thead><tbody>{analysis?.pivots && Object.entries(analysis.pivots).map(([name,p]) => <tr key={name}><th scope="row">{name}</th>{[p.s3,p.s2,p.s1,p.pivot,p.r1,p.r2,p.r3].map((value,i) => <td key={i} className="num numeric">{level(value)}</td>)}</tr>)}</tbody></table></div>{!analysis?.pivots && <EmptyState>Pivot levels require available candle history.</EmptyState>}</section>
      <section className="panel"><PanelHeading title="Research notes" meta={insightsLoading ? "Loading analysis…" : insightSource || "Unavailable"} />{stockInsights ? <div className="insight-columns"><div><h3>Technical observations</h3><ul>{stockInsights.technical.map((text,i) => <li key={i}>{text}</li>)}</ul></div><div><h3>Quantitative context</h3><ul>{stockInsights.quantitative.map((text,i) => <li key={i}>{text}</li>)}</ul></div></div> : <EmptyState>{insightsLoading ? "Requesting insights…" : "Research notes are unavailable. Measured indicators remain available above."}</EmptyState>}</section>
    </div><aside className="stack chart-sidebar" aria-label="Technical indicator summary"><section className="panel"><PanelHeading title="Indicator monitor" meta={interval ? `${interval} bars` : "Loading"} /><dl className="metric-list">
      <div><dt>Trend</dt><dd className={sentimentClass}>{analysis?.sentiment ?? "—"}</dd></div>
      <div><dt>RSI / 14</dt><dd className="numeric">{analysis?.rsi?.toFixed(2) ?? "—"}</dd></div>
      {([9,21,50,200] as const).map(period => <div key={period}><dt>EMA / {period}</dt><dd className="numeric">{level(analysis?.ema[period])}</dd></div>)}
      <div><dt>MACD / 12,26,9</dt><dd className="numeric">{analysis?.macd.value?.toFixed(2) ?? "—"}</dd></div><div><dt>Signal</dt><dd className="numeric">{analysis?.macd.signal?.toFixed(2) ?? "—"}</dd></div><div><dt>Histogram</dt><dd className="numeric">{analysis?.macd.histogram?.toFixed(2) ?? "—"}</dd></div>
    </dl><div className="panel-footer"><span className="numeric">{analysis?.bars ?? "—"} analysis bars</span><span>Includes warm-up</span></div></section>
    <section className="panel"><PanelHeading title="Pattern observations" /><ul className="pattern-list">{(analysis?.patterns.length ? analysis.patterns : [chartLoading ? "Loading observations…" : "No qualifying pattern"]).map((name,i) => <li key={name}><span>{String(i+1).padStart(2,"0")}</span>{name}</li>)}</ul><p className="panel-body muted help-note">Rule-based observations. No backtested win rate or price target is available.</p></section></aside></div>
  </div>;
}

function ChartsRoute() {
  const params = useSearchParams();
  const symbol = params.get("symbol")?.toUpperCase() ?? "RELIANCE";
  return <ChartsWorkspace key={symbol} initialSymbol={symbol} />;
}
export default function ChartsPage() {
  return <Suspense fallback={<div className="page"><EmptyState>Loading chart workspace…</EmptyState></div>}><ChartsRoute /></Suspense>;
}
