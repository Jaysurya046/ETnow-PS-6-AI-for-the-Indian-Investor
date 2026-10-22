import yahooFinance from "@/lib/yahoo";
import { ttlCache } from "@/lib/cache";
import { calculateIndicators, calculateChartSeries, type CandleBar } from "@/lib/indicators";

export const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
export type TimeRange = typeof RANGES[number];

export const getChartData = ttlCache(async (symbol: string, range: TimeRange) => {
  const end = new Date(), visibleStart = new Date(end), warmup = new Date(end);
  let interval: "15m" | "1h" | "1d" | "1wk" = "1d";
  if (range === "1D") { visibleStart.setDate(end.getDate()-3); warmup.setDate(end.getDate()-30); interval = "15m"; }
  else if (range === "1W") { visibleStart.setDate(end.getDate()-7); warmup.setDate(end.getDate()-60); interval = "1h"; }
  else if (range === "1Y") { visibleStart.setFullYear(end.getFullYear()-1); warmup.setFullYear(end.getFullYear()-6); interval = "1wk"; }
  else { visibleStart.setMonth(end.getMonth()-({ "1M": 1, "3M": 3, "6M": 6 }[range])); warmup.setDate(end.getDate()-450); }
  const result = await yahooFinance.chart(symbol, { period1: warmup, period2: end, interval });
  const all: CandleBar[] = [];
  for (const q of result.quotes) {
    if (q.open == null || q.high == null || q.low == null || q.close == null) continue;
    const bar = { time: Math.floor(new Date(q.date).getTime()/1000), open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume ?? 0 };
    if (Object.values(bar).every(Number.isFinite)) all.push(bar);
  }
  const sorted = [...new Map(all.map(c => [c.time, c])).values()].sort((a,b) => a.time-b.time);
  if (!sorted.length) throw new Error("No valid candle data");
  return { candles: sorted.filter(c => c.time >= visibleStart.getTime()/1000), indicatorSeries: calculateChartSeries(sorted, visibleStart.getTime()/1000), analysis: calculateIndicators(sorted), interval, asOf: sorted.at(-1)!.time };
});
