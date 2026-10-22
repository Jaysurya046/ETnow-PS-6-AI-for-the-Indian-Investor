"use client";
import { usePathname } from "next/navigation";
import { useMarketFeed, type MarketQuote } from "@/lib/useMarketFeed";
import { fixedQuote } from "@/components/Terminal";

const NAMES: Record<string, string> = { "/": "Market overview", "/radar": "Signal monitor", "/charts": "Chart analysis", "/chat": "Research desk", "/video": "Market briefing" };
export default function Header() {
  const pathname = usePathname();
  const { data, error } = useMarketFeed<MarketQuote[]>("/api/market");
  return <header className="header">
    <div className="header-top"><div className="header-location"><span className="header-product">ETNow Terminal</span><span className="slash">/</span><span>{NAMES[pathname] ?? "Workspace"}</span></div><div className="header-status"><span className={`status-dot ${error ? "status-error" : ""}`} /><span>{error ? "Feed unavailable" : data ? "Latest available quotes" : "Connecting to feed"}</span><span className="header-region">NSE / BSE · IST</span></div></div>
    <div className="quote-strip" role="region" aria-label="Market benchmark quotes" tabIndex={0}>
      {data?.map(q => <div className="strip-quote" key={q.name}><span>{q.name}</span><strong className="numeric">{fixedQuote(q.price)}</strong><span className={`numeric ${q.up ? "positive" : "negative"}`}>{q.pct}</span></div>)}
      {!data && <span className="feed-placeholder">{error ? "Market quotes are temporarily unavailable." : "Loading benchmarks, currencies and commodities…"}</span>}
    </div>
  </header>;
}
