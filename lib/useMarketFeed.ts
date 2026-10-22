"use client";
import { useEffect, useState } from "react";

export interface MarketQuote { symbol: string; name: string; price: string; change: string; pct: string; up: boolean; asOf: string | null }
export interface SectorQuote { name: string; change: number; asOf: string | null }
export interface MoverQuote { stock: string; change: string; val: string; dir: "up" | "down" }
export interface MoversResponse { gainers: MoverQuote[]; losers: MoverQuote[]; coverage: number; universe: number }

export function useMarketFeed<T>(url: string, refreshMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Feed unavailable");
        const payload: T = await response.json();
        if (!controller.signal.aborted) { setData(payload); setError(false); }
      } catch { if (!controller.signal.aborted) setError(true); }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), refreshMs);
    return () => { controller.abort(); clearInterval(timer); };
  }, [url, refreshMs]);
  return { data, error };
}
