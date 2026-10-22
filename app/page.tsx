"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useMarketFeed, type MarketQuote, type MoversResponse, type SectorQuote } from "@/lib/useMarketFeed";
import { PageHeading, PanelHeading, EmptyState, signed, fixedQuote } from "@/components/Terminal";
import MarketTable from "@/components/MarketTable";

const BENCHMARKS = ["NIFTY 50", "SENSEX", "BANK NIFTY", "NIFTY IT", "USD/INR"];
const WORKSPACES = [
  { href: "/radar", name: "Signal monitor", note: "Price momentum and market observations", code: "02" },
  { href: "/charts", name: "Chart analysis", note: "Candles, indicators and pivot levels", code: "03" },
  { href: "/chat", name: "Research desk", note: "Portfolio context and streaming research", code: "04" },
  { href: "/video", name: "Market briefing", note: "Sector performance and script preparation", code: "05" },
];
export default function HomePage() {
  const market = useMarketFeed<MarketQuote[]>("/api/market");
  const movers = useMarketFeed<MoversResponse>("/api/movers");
  const sectors = useMarketFeed<SectorQuote[]>("/api/sectors");
  const [view, setView] = useState("All movers");
  const [search, setSearch] = useState("");
  const rows = (view === "Gainers" ? movers.data?.gainers : view === "Losers" ? movers.data?.losers : [...(movers.data?.gainers ?? []), ...(movers.data?.losers ?? [])]) ?? [];
  const filtered = rows.filter(row => row.stock.includes(search.toUpperCase()));
  return <div className="page overview-page">
    <PageHeading index="01" title="Market overview" description="Indian equities, sector performance and session movers."><span className="label-tag">CASH MARKET</span><Link className="btn btn-primary" href="/charts">Open chart <ArrowUpRight size={14} aria-hidden="true" /></Link></PageHeading>
    <section className="benchmark-grid" aria-label="Benchmark snapshot">{BENCHMARKS.map(name => {
      const quote = market.data?.find(q => q.name === name);
      return <div className="benchmark" key={name}><span className="eyebrow">{name}</span><strong className="numeric benchmark-price">{quote ? fixedQuote(quote.price) : "—"}</strong><div className={`numeric ${quote ? quote.up ? "positive" : "negative" : "muted"}`}>{quote ? `${quote.up ? "↑" : "↓"} ${quote.pct}` : market.error ? "Unavailable" : "Loading"}</div><span className="benchmark-time">{quote?.asOf ? new Date(quote.asOf).toLocaleTimeString("en-IN", { timeZone:"Asia/Kolkata", hour:"2-digit", minute:"2-digit", hour12:false })+" IST · latest quote" : "Yahoo Finance"}</span></div>;
    })}</section>
    <div className="overview-grid">
      <section className="panel movers-panel"><PanelHeading title="Session movers" meta={`NIFTY 100 · ${movers.data?.coverage ?? "—"}/${movers.data?.universe ?? 100} quotes`}><Link href="/radar" className="text-link">Signal monitor <ArrowUpRight size={13} aria-hidden="true" /></Link></PanelHeading>
        <div className="toolbar"><div className="segmented" role="group" aria-label="Mover direction">{["All movers","Gainers","Losers"].map(label => <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div><label className="search-field"><Search size={14} aria-hidden="true" /><span className="sr-only">Filter instruments</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter symbol" /></label></div>
        {movers.error && movers.data && <p className="notice">Refresh unavailable. Showing the last retrieved quotes.</p>}
        <MarketTable rows={filtered} loading={!movers.data} error={movers.error} />
        <div className="panel-footer"><span>Ranked by session percentage change</span><span className="numeric">30s refresh</span></div>
      </section>
      <div className="overview-side"><section className="panel"><PanelHeading title="Sector performance" meta="NSE indices" />
        <div className="sector-list">{sectors.data?.map(sector => <div className="sector-row" key={sector.name}><span>{sector.name}</span><div className="sector-track" aria-hidden="true"><span className={sector.change >= 0 ? "bar-positive" : "bar-negative"} style={{ width: `${Math.min(Math.abs(sector.change)*24,100)}%` }} /></div><strong className={`numeric ${sector.change >= 0 ? "positive" : "negative"}`}>{signed(sector.change)}%</strong></div>)}</div>{!sectors.data && <EmptyState>{sectors.error ? "Sector feed unavailable." : "Loading indices…"}</EmptyState>}
        <div className="panel-footer">Latest available trading session</div>
      </section><section className="panel"><PanelHeading title="Workspaces" meta="QUICK ACCESS" /><div className="workspace-list">{WORKSPACES.map(w => <Link href={w.href} key={w.code}><span className="workspace-code">{w.code}</span><span><strong>{w.name}</strong><small>{w.note}</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div></section></div>
    </div>
    <footer className="workspace-footer"><span>Data: Yahoo Finance · Quotes may be delayed</span><span className="numeric">NSE / BSE · INR · IST</span></footer>
  </div>;
}
