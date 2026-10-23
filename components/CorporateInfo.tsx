"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { NIFTY_100 } from "@/lib/nifty100";
import { PORTFOLIO_KEY, parseHoldings } from "@/lib/portfolio";
import { useMarketFeed } from "@/lib/useMarketFeed";
import { corporateSymbol, filterCorporateInfo, upcomingExDate } from "@/lib/corporate-utils";
import type { CorporateInfoResponse, CorporateTab } from "@/lib/corporate-types";
import { EmptyState, PanelHeading } from "@/components/Terminal";

const TABS: {id:CorporateTab; label:string; url:string}[] = [
  {id:"announcements",label:"Corporate Announcement",url:"announcements"},
  {id:"actions",label:"Corporate Action",url:"actions"},
  {id:"results",label:"Financial Results",url:"financial-results"},
];
const INDEX_SYMBOLS = NIFTY_100.map(stock=>corporateSymbol(stock.sym));
const stamp = (value: string) => new Date(value).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Kolkata"});

function CorporateRecords({url,tab,symbols,search,emptyPortfolio}:{url:string;tab:CorporateTab;symbols:string[];search:string;emptyPortfolio:boolean}) {
  const {data,error} = useMarketFeed<CorporateInfoResponse>(url,60_000);
  const [now,setNow] = useState(0);
  useEffect(()=> { const tick = ()=>setNow(Date.now());tick();const timer=setInterval(tick,60_000);return ()=>clearInterval(timer); },[]);
  const filtered = data ? filterCorporateInfo(data,symbols,search) : null;
  const count = filtered?.[tab].length ?? 0;
  const company = (row:{symbol:string;companyName:string}) => <Link className="corporate-company" href={`/charts?symbol=${encodeURIComponent(row.symbol)}`}>{row.companyName} <span className="numeric">({row.symbol})</span></Link>;
  return <>
    <div className="corporate-records" aria-live="polite" aria-busy={!data && !error}>
      {tab === "announcements" && filtered?.announcements.map(row=><article className="corporate-record" key={row.id}><div>{company(row)}<p><span className="muted">Subject:</span> {row.subject}</p><p className="numeric corporate-date">Broadcast Date: {stamp(row.broadcastDate)} IST</p></div>{row.attachmentUrl && <a className={`corporate-file ${row.hasPdf ? "corporate-pdf" : ""}`} href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" aria-label={`${row.hasPdf ? "PDF" : "Attachment"} for ${row.symbol}${row.attachmentSize ? `, ${row.attachmentSize}` : ""}`}><strong>{row.hasPdf ? "PDF" : "FILE"}</strong>{row.attachmentSize && <span>{row.attachmentSize}</span>}</a>}</article>)}
      {tab === "actions" && filtered?.actions.map(row=><article className="corporate-record" key={row.id}><div>{company(row)}<p className="corporate-purpose"><span className="muted">Purpose:</span> {row.purpose}</p><p>Series: <span className="numeric">{row.series}</span></p><div className="corporate-action-dates numeric"><span className={now && upcomingExDate(row.exDate,now) ? "corporate-upcoming" : ""}>Ex-Date: {row.exDate}{!!now && upcomingExDate(row.exDate,now) && " · UPCOMING / TODAY"}</span><span>Record Date: {row.recordDate}</span></div></div></article>)}
      {tab === "results" && filtered?.results.map(row=><article className="corporate-record" key={row.id}><div>{company(row)}<p>Audit status: {row.audited}</p><p>Reporting basis: {row.cumulative}</p><p className="numeric corporate-date">Broadcast Date: {stamp(row.broadcastDate)} IST</p></div>{row.hasXml && row.attachmentUrl && <a className="corporate-file corporate-xml" href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" aria-label={`XML / XBRL results for ${row.symbol}`}><strong>XML</strong><span>XBRL</span></a>}</article>)}
      {!count && <EmptyState>{emptyPortfolio ? "No active holdings. Add stocks to your portfolio to filter their disclosures." : !data && !error ? "Loading official NSE filings…" : error && !data ? "NSE filings unavailable. Retrying automatically." : "No disclosures match this scope and search. This is the available feed window, not a complete company history."}</EmptyState>}
    </div>
    <div className="panel-footer corporate-feed-status" role="status"><span>Data: NSE India · {data ? <>Updated <span className="numeric">{stamp(data.asOf)} IST</span></> : "Awaiting feed"}</span><span className={data?.isStale || error ? "feed-stale" : "muted"}>{data?.isStale || error ? "STALE · cached / refresh unavailable" : data ? "LATEST AVAILABLE" : "LOADING"}</span><span className="numeric">{count} filings · 60s polling</span></div>
  </>;
}

export default function CorporateInfo({portfolioSymbols,defaultScope="index",compact=false}:{portfolioSymbols?:string[];defaultScope?:"index"|"portfolio";compact?:boolean}) {
  const [tab,setTab] = useState<CorporateTab>("announcements");
  const [scope,setScope] = useState(defaultScope);
  const [search,setSearch] = useState("");
  const [storedSymbols,setStoredSymbols] = useState<string[]>([]);
  const id = useId();
  useEffect(()=> {
    if (portfolioSymbols !== undefined) return;
    const read = () => {
      try { const saved = localStorage.getItem(PORTFOLIO_KEY);setStoredSymbols((parseHoldings(saved ? JSON.parse(saved) : []) ?? []).map(row=>row.symbol)); }
      catch { setStoredSymbols([]); }
    };
    read();window.addEventListener("storage",read);window.addEventListener("focus",read);
    return ()=> { window.removeEventListener("storage",read);window.removeEventListener("focus",read); };
  },[portfolioSymbols]);
  const held = [...new Set((portfolioSymbols ?? storedSymbols).map(corporateSymbol))];
  const symbols = scope === "index" ? INDEX_SYMBOLS : held;
  const url = `/api/corporate-info?tab=${tab}${scope === "portfolio" && held.length ? `&symbol=${encodeURIComponent(held.join(","))}` : ""}`;
  const active = TABS.find(item=>item.id===tab)!;
  return <section className={`panel corporate-info${compact ? " corporate-compact" : ""}`} aria-label="Corporate Info">
    <PanelHeading title="Corporate Info" meta="OFFICIAL NSE FILINGS"><a className="text-link" href={`https://www.nseindia.com/companies-listing/corporate-filings-${active.url}`} target="_blank" rel="noopener noreferrer">View more<span className="sr-only"> on NSE India</span></a></PanelHeading>
    <div className="corporate-toolbar"><div className="segmented" role="group" aria-label="Disclosure scope"><button aria-pressed={scope === "index"} onClick={()=>setScope("index")}>All NIFTY 100</button><button aria-pressed={scope === "portfolio"} onClick={()=>setScope("portfolio")}>My Portfolio Only</button></div><label className="search-field"><Search size={14} aria-hidden="true"/><span className="sr-only">Search corporate disclosures</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Ticker or subject"/></label></div>
    <div className="corporate-tabs" role="tablist" aria-label="Corporate disclosure categories" onKeyDown={event=>{
      const current=TABS.findIndex(item=>item.id===tab);
      const next=event.key==="ArrowRight" ? (current+1)%3 : event.key==="ArrowLeft" ? (current+2)%3 : event.key==="Home" ? 0 : event.key==="End" ? 2 : -1;
      if(next>=0){event.preventDefault();setTab(TABS[next].id);event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next].focus();}
    }}>{TABS.map(item=><button type="button" role="tab" tabIndex={tab===item.id ? 0 : -1} id={`${id}-${item.id}`} aria-controls={`${id}-panel`} aria-selected={tab===item.id} key={item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}</div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`}><CorporateRecords key={url} url={url} tab={tab} symbols={symbols} search={search} emptyPortfolio={scope === "portfolio" && !held.length}/></div>
  </section>;
}
