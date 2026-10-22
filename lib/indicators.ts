import { RSI, EMA, MACD, BollingerBands } from "technicalindicators";
import type { UTCTimestamp } from "lightweight-charts";

export interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint { time: UTCTimestamp; value: number }
export interface BollingerPoint { time: UTCTimestamp; upper: number; middle: number; lower: number }
export interface ChartIndicatorSeries {
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  ema200: IndicatorPoint[];
  bollinger: BollingerPoint[];
  rsi: IndicatorPoint[];
}

/** Shared ordering/validation keeps all series on the candle time axis. Last duplicate wins. */
export function chronologicalCandles(candles: CandleBar[]): CandleBar[] {
  return [...new Map(candles.filter(c => Number.isInteger(c.time) && c.time > 0 &&
    [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite)).map(c => [c.time, c])).values()]
    .sort((a,b) => a.time - b.time);
}
const validPeriod = (period: number) => Number.isInteger(period) && period > 0;

export function calculateEmaSeries(candles: CandleBar[], period: number): IndicatorPoint[] {
  const bars = chronologicalCandles(candles);
  if (!validPeriod(period) || bars.length < period) return [];
  return EMA.calculate({ values: bars.map(c => c.close), period }).map((value, index) => ({
    time: bars[index + period - 1].time as UTCTimestamp, value,
  }));
}
export function calculateBollingerBandsSeries(candles: CandleBar[], period = 20, stdDev = 2): BollingerPoint[] {
  const bars = chronologicalCandles(candles);
  if (!validPeriod(period) || !Number.isFinite(stdDev) || stdDev < 0 || bars.length < period) return [];
  return BollingerBands.calculate({ values: bars.map(c => c.close), period, stdDev }).map((value, index) => ({
    time: bars[index + period - 1].time as UTCTimestamp, upper: value.upper, middle: value.middle, lower: value.lower,
  }));
}
export function calculateRsiSeries(candles: CandleBar[], period = 14): IndicatorPoint[] {
  const bars = chronologicalCandles(candles);
  // RSI requires period changes, hence period + 1 closes.
  if (!validPeriod(period) || bars.length <= period) return [];
  return RSI.calculate({ values: bars.map(c => c.close), period }).map((value, index) => ({
    time: bars[index + period].time as UTCTimestamp, value,
  }));
}

export function calculateChartSeries(candles: CandleBar[], visibleStart = 0): ChartIndicatorSeries {
  const visible = <T extends { time: UTCTimestamp }>(series: T[]) => series.filter(point => point.time >= visibleStart);
  return {
    ema20: visible(calculateEmaSeries(candles, 20)), ema50: visible(calculateEmaSeries(candles, 50)),
    ema200: visible(calculateEmaSeries(candles, 200)), bollinger: visible(calculateBollingerBandsSeries(candles)),
    rsi: visible(calculateRsiSeries(candles)),
  };
}

export interface PivotLevels {
  pivot: number;
  r1: number; r2: number; r3: number;
  s1: number; s2: number; s3: number;
}

export interface TechnicalAnalysis {
  bars: number;
  rsi: number | null;
  ema: Record<9 | 21 | 50 | 200, number | null>;
  macd: { value: number | null; signal: number | null; histogram: number | null };
  pivots: Record<"Classic" | "Camarilla" | "Fibonacci", PivotLevels> | null;
  patterns: string[];
  sentiment: "Bullish" | "Bearish" | "Neutral";
}

const finite = (value: number | undefined): number | null => Number.isFinite(value) ? value! : null;

/** All periods refer to bars at the requested chart interval, including warm-up bars. */
export function calculateIndicators(candles: CandleBar[]): TechnicalAnalysis {
  const bars = candles.filter(c => [c.time, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);
  const closes = bars.map(c => c.close);
  const emaSeries = (period: number) => EMA.calculate({ values: closes, period });
  const ema9 = emaSeries(9), ema21 = emaSeries(21);
  const ema = { 9: finite(ema9.at(-1)), 21: finite(ema21.at(-1)), 50: finite(emaSeries(50).at(-1)), 200: finite(emaSeries(200).at(-1)) };
  const macd = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).at(-1);
  const last = bars.at(-1), prev = bars.at(-2);
  let pivots: TechnicalAnalysis["pivots"] = null;
  const patterns: string[] = [];
  if (prev) {
    // Previous bar anchors the next bar's projected levels, never the current partial bar.
    const { high: h, low: l, close: c } = prev;
    const p = (h + l + c) / 3, d = h - l;
    pivots = {
      Classic: { pivot: p, r1: 2*p-l, r2: p+d, r3: h+2*(p-l), s1: 2*p-h, s2: p-d, s3: l-2*(h-p) },
      Camarilla: { pivot: p, r1: c+d*1.1/12, r2: c+d*1.1/6, r3: c+d*1.1/4, s1: c-d*1.1/12, s2: c-d*1.1/6, s3: c-d*1.1/4 },
      Fibonacci: { pivot: p, r1: p+d*0.382, r2: p+d*0.618, r3: p+d, s1: p-d*0.382, s2: p-d*0.618, s3: p-d },
    };
  }
  if (last && prev) {
    if (last.close > last.open && prev.close < prev.open && last.open <= prev.close && last.close >= prev.open) patterns.push("Bullish engulfing");
    if (last.close < last.open && prev.close > prev.open && last.open >= prev.close && last.close <= prev.open) patterns.push("Bearish engulfing");
    const body = Math.abs(last.close-last.open), span = last.high-last.low;
    if (span > 0 && body/span <= 0.1) patterns.push("Doji — indecision");
    if (body > 0 && Math.min(last.open,last.close)-last.low >= body*2 && last.high-Math.max(last.open,last.close) <= body) patterns.push("Hammer-shaped candle");
    if (ema9.length > 1 && ema21.length > 1) {
      if (ema9.at(-2)! <= ema21.at(-2)! && ema9.at(-1)! > ema21.at(-1)!) patterns.push("Bullish EMA 9/21 crossover");
      if (ema9.at(-2)! >= ema21.at(-2)! && ema9.at(-1)! < ema21.at(-1)!) patterns.push("Bearish EMA 9/21 crossover");
    }
    const window = bars.slice(-21, -1);
    if (window.length === 20) {
      const volume = window.reduce((sum, c) => sum+c.volume, 0)/20;
      if (last.close > Math.max(...window.map(c => c.high))) patterns.push(`20-bar resistance breakout${volume > 0 && last.volume > volume*1.5 ? " with elevated volume" : ""}`);
      if (last.close < Math.min(...window.map(c => c.low))) patterns.push("20-bar support breakdown");
    }
  }
  const sentiment = last && ema[21] !== null ? (last.close > ema[21] && ema[9]! > ema[21] ? "Bullish" : last.close < ema[21] && ema[9]! < ema[21] ? "Bearish" : "Neutral") : "Neutral";
  return { bars: bars.length, rsi: finite(RSI.calculate({ values: closes, period: 14 }).at(-1)), ema,
    macd: { value: finite(macd?.MACD), signal: finite(macd?.signal), histogram: finite(macd?.histogram) }, pivots, patterns, sentiment };
}
