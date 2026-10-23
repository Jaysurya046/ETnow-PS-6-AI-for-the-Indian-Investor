"use client";
import CorporateInfo from "@/components/CorporateInfo";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { NIFTY_100 } from "@/lib/nifty100";
import { useMarketFeed } from "@/lib/useMarketFeed";
import { PageHeading, PanelHeading, EmptyState, fixedQuote } from "@/components/Terminal";

type SignalType = "BUY" | "SELL" | "WATCH" | "INSIDER" | "ALERT";
interface Signal { id:number; stock:string; fullName:string; sector:string; cap:string; type:SignalType; event:string; reasoning:string; confidence:number; price:string; target:string; timeAgo:string; tags:string[] }
const SECTORS = ["All sectors", ...new Set(NIFTY_100.map(s => s.sector))];
export default function RadarPage() {
  const { data, error } = useMarketFeed<Signal[]>("/api/radar", 60_000);
  const [sector,setSector] = useState("All sectors");
  const [type,setType] = useState("All signals");
  const [cap,setCap] = useState("All caps");
  const [search,setSearch] = useState("");
  const rows = (data ?? []).filter(s => (sector === "All sectors" || s.sector === sector) && (type === "All signals" || s.type === type) && (cap === "All caps" || s.cap === cap) && (s.stock+" "+s.fullName).toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><PageHeading index="02" title="Signal monitor" description="Observed price momentum across the NIFTY 100 universe."><span className="label-tag">{error ? "FEED UNAVAILABLE" : data ? "LATEST QUOTES" : "LOADING"}</span></PageHeading>
    <div className="signal-corporate-grid"><section className="panel"><PanelHeading title="Market observations" meta="PRICE MOMENTUM" /><div className="stat-line"><span>Observations<strong className="numeric">{data?.length ?? "—"}</strong></span><span>Buy<strong className="numeric">{data?.filter(s => s.type === "BUY").length ?? "—"}</strong></span><span>Sell<strong className="numeric">{data?.filter(s => s.type === "SELL").length ?? "—"}</strong></span><span>Watch<strong className="numeric">{data?.filter(s => s.type === "WATCH").length ?? "—"}</strong></span><span>Showing<strong className="numeric">{rows.length}</strong></span></div>
    <div className="toolbar"><label className="filter-field">Signal<select className="input" value={type} onChange={e => setType(e.target.value)}>{["All signals","BUY","SELL","WATCH","INSIDER","ALERT"].map(x => <option key={x}>{x}</option>)}</select></label><label className="filter-field">Sector<select className="input" value={sector} onChange={e => setSector(e.target.value)}>{SECTORS.map(x => <option key={x}>{x}</option>)}</select></label><label className="filter-field">Cap<select className="input" value={cap} onChange={e => setCap(e.target.value)}>{["All caps","Large","Mid","Small"].map(x => <option key={x}>{x}</option>)}</select></label><label className="search-field"><Search size={14} aria-hidden="true" /><span className="sr-only">Filter signal instruments</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter symbol" /></label></div>
    {error && data && <p className="notice">Refresh unavailable. Showing the last retrieved observations.</p>}
    <div className="table-scroll" role="region" aria-label="Signal observations" tabIndex={0}><table className="data-table"><thead><tr><th scope="col">Instrument</th><th scope="col">Signal</th><th scope="col" className="num">Last / INR</th><th scope="col" className="num">Momentum / 100</th><th scope="col">Observation</th><th scope="col"><span className="sr-only">Analyze</span></th></tr></thead><tbody>{rows.map(s => <tr key={s.id}><th scope="row"><Link className="symbol-link" href={`/charts?symbol=${encodeURIComponent(s.stock)}`}>{s.stock}</Link><span className="cell-subline">{s.sector}</span></th><td><span className={`badge badge-${s.type.toLowerCase()}`}>{s.type}</span></td><td className="num numeric">{fixedQuote("₹"+s.price)}</td><td className="num numeric">{s.confidence}</td><td className="signal-note"><details><summary className="signal-event">{s.event}</summary><p className="signal-reason">{s.reasoning}</p><p className="signal-detail">{s.tags.join(" · ")}</p></details><p className="signal-detail numeric">{s.timeAgo}</p></td><td><Link className="icon-button" href={`/charts?symbol=${encodeURIComponent(s.stock)}`} aria-label={`Analyze ${s.stock}`}><ArrowUpRight size={16} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
    {!rows.length && <EmptyState>{error ? "Market observations are temporarily unavailable." : !data ? "Fetching market observations…" : "No observations match these filters."}</EmptyState>}
    <div className="panel-footer"><span>Momentum score: absolute daily percentage change × 10, capped at 100. Not a probability.</span><span className="numeric">60s refresh</span></div></section><CorporateInfo /></div>
  </div>;
}
