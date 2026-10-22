"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, LineStyle,
  type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { chronologicalCandles, type CandleBar, type ChartIndicatorSeries } from "@/lib/indicators";

const CONTROLS = [
  { key: "ema20", label: "EMA 20", color: "--chart-ema20" },
  { key: "ema50", label: "EMA 50", color: "--chart-ema50" },
  { key: "ema200", label: "EMA 200", color: "--chart-ema200" },
  { key: "bollinger", label: "BB (20,2)", color: "--chart-bb-middle" },
  { key: "rsi", label: "RSI (14)", color: "--chart-rsi" },
] as const;
type IndicatorKey = typeof CONTROLS[number]["key"];
type Visibility = Record<IndicatorKey, boolean>;
type OverlayKey = "ema20" | "ema50" | "ema200" | "upper" | "middle" | "lower";
const EMPTY_SERIES: ChartIndicatorSeries = { ema20: [], ema50: [], ema200: [], bollinger: [], rsi: [] };

interface ChartProps {
  data: CandleBar[];
  indicators: ChartIndicatorSeries;
  loading: boolean;
  visibility: Visibility;
}

function ChartCanvas({ data, indicators, loading, visibility }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaysRef = useRef<Partial<Record<OverlayKey, ISeriesApi<"Line">>>>({});
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string) => tokens.getPropertyValue(name).trim();
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: token("--bg-secondary") },
        textColor: token("--text-secondary"), fontFamily: "IBM Plex Mono, Consolas, monospace", fontSize: 11,
        panes: { separatorColor: token("--border-subtle"), separatorHoverColor: token("--border-strong"), enableResize: false },
      },
      grid: { vertLines: { color: token("--bg-subtle") }, horzLines: { color: token("--bg-subtle") } },
      crosshair: {
        mode: 0,
        vertLine: { color: token("--border-strong"), labelBackgroundColor: token("--gold") },
        horzLine: { color: token("--border-strong"), labelBackgroundColor: token("--gold") },
      },
      rightPriceScale: { borderColor: token("--border-subtle"), scaleMargins: { top: 0.08, bottom: 0.22 }, minimumWidth: 66 },
      timeScale: { borderColor: token("--border-subtle"), timeVisible: true, secondsVisible: false, barSpacing: 8, rightOffset: 3 },
      // Keep oscillator scale fixed; wheel/pinch and time-axis zoom still work.
      handleScale: { axisPressedMouseMove: { price: false, time: true }, axisDoubleClickReset: { price: false, time: true } },
      localization: { locale: "en-IN" },
      width: container.clientWidth, height: container.clientHeight,
    });
    chartRef.current = chart;
    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: token("--green"), downColor: token("--red"), borderUpColor: token("--green"),
      borderDownColor: token("--red"), wickUpColor: token("--green"), wickDownColor: token("--red"),
    });
    volumeRef.current = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    for (const key of ["ema20", "ema50", "ema200", "upper", "middle", "lower"] as const) {
      const isBand = ["upper", "middle", "lower"].includes(key);
      const color = isBand ? key === "middle" ? "--chart-bb-middle" : "--chart-bb-edge" : `--chart-${key}`;
      overlaysRef.current[key] = chart.addSeries(LineSeries, {
        title: isBand ? `BB ${key}` : `EMA ${key.slice(3)}`, color: token(color),
        lineWidth: isBand ? 1 : 2, lineStyle: isBand && key !== "middle" ? LineStyle.Dashed : LineStyle.Solid,
        visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true,
      });
    }
    const resize = () => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return;
      // Flush layout before setting pane height; otherwise the old pane dimensions
      // produce a proportional stretch when crossing responsive breakpoints.
      chart.resize(container.clientWidth, container.clientHeight, true);
      if (rsiRef.current) chart.panes()[1]?.setHeight(100);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null; candleRef.current = null; volumeRef.current = null;
      overlaysRef.current = {}; rsiRef.current = null; fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const key of ["ema20", "ema50", "ema200"] as const) overlaysRef.current[key]?.applyOptions({ visible: visibility[key] });
    for (const key of ["upper", "middle", "lower"] as const) overlaysRef.current[key]?.applyOptions({ visible: visibility.bollinger });
    if (visibility.rsi && !rsiRef.current) {
      const tokens = getComputedStyle(document.documentElement);
      const token = (name: string) => tokens.getPropertyValue(name).trim();
      // Native panes share one time scale and crosshair, avoiding two-chart sync loops.
      const rsi = chart.addSeries(LineSeries, {
        title: "RSI 14", color: token("--chart-rsi"), lineWidth: 2, priceLineVisible: false,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      }, 1);
      rsi.priceScale().applyOptions({ autoScale: true, scaleMargins: { top: 0, bottom: 0 } });
      for (const [price, color, lineStyle] of [
        [70, "--chart-rsi-overbought", LineStyle.Dashed], [30, "--chart-rsi-oversold", LineStyle.Dashed],
        [50, "--chart-rsi-midline", LineStyle.Dotted],
      ] as const) rsi.createPriceLine({ price, color: token(color), lineStyle, lineWidth: 1, axisLabelVisible: true, title: "" });
      rsiRef.current = rsi;
    } else if (!visibility.rsi && rsiRef.current) {
      chart.removeSeries(rsiRef.current); // Last series removal also removes the pane.
      rsiRef.current = null;
    }
    if (rsiRef.current) {
      rsiRef.current.setData(indicators.rsi);
      chart.panes()[1]?.setHeight(100);
    }
  }, [visibility, indicators]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candleRef.current || !volumeRef.current) return;
    const sorted = chronologicalCandles(data);
    const tokens = getComputedStyle(document.documentElement);
    candleRef.current.setData(sorted.map(c => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    volumeRef.current.setData(sorted.map(c => ({ time: c.time as UTCTimestamp, value: c.volume, color: tokens.getPropertyValue(c.close >= c.open ? "--volume-up" : "--volume-down").trim() })));
    for (const key of ["ema20", "ema50", "ema200"] as const) overlaysRef.current[key]?.setData(indicators[key]);
    for (const key of ["upper", "middle", "lower"] as const) overlaysRef.current[key]?.setData(indicators.bollinger.map(point => ({ time: point.time, value: point[key] })));
    // Fit once per instrument/range; toggles and periodic refreshes preserve manual zoom.
    if (!fittedRef.current && sorted.length) { chart.timeScale().fitContent(); fittedRef.current = true; }
  }, [data, indicators]);

  return <div className={`chart-canvas${visibility.rsi ? " has-rsi" : ""}`} role="group" aria-label="Interactive price and volume chart with technical indicators">
    <div className="canvas-target" ref={containerRef} />
    {visibility.rsi && <span className="rsi-pane-label">RSI 14 · 0–100</span>}
    {loading && <div className="chart-overlay" role="status">Loading candles…</div>}
    {!loading && !data.length && <div className="chart-overlay" role="status">Chart data unavailable.</div>}
  </div>;
}

export default function CandlestickChart({ data, indicators = EMPTY_SERIES, loading, chartKey }: {
  data: CandleBar[]; indicators?: ChartIndicatorSeries; loading: boolean; chartKey: string;
}) {
  const [visibility, setVisibility] = useState<Visibility>({ ema20: true, ema50: true, ema200: false, bollinger: false, rsi: true });
  const unavailable = CONTROLS.filter(control => visibility[control.key] && !indicators[control.key].length).map(control => control.label);
  return <>
    <div className="chart-indicator-bar" role="group" aria-label="Technical overlays">{CONTROLS.map(control => <button
      type="button" key={control.key} aria-pressed={visibility[control.key]} style={{ "--indicator-color": `var(${control.color})` } as React.CSSProperties}
      onClick={() => setVisibility(current => ({ ...current, [control.key]: !current[control.key] }))}>
      <span className="indicator-swatch" aria-hidden="true" />{control.label}
    </button>)}</div>
    <ChartCanvas key={chartKey} data={data} indicators={indicators} loading={loading} visibility={visibility} />
    {!loading && data.length > 0 && unavailable.length > 0 && <p className="indicator-note" role="status">Insufficient history: {unavailable.join(", ")}. Periods refer to chart bars.</p>}
  </>;
}
