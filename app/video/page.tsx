"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import SafeMarkdown from "@/components/SafeMarkdown";
import MarketTable from "@/components/MarketTable";
import { PageHeading, PanelHeading, EmptyState, signed } from "@/components/Terminal";
import { useMarketFeed, type SectorQuote, type MoversResponse } from "@/lib/useMarketFeed";

const FII_DII_DATA = [
  { date: "Mar 20", fii: 2140, dii: -240 },
  { date: "Mar 21", fii: -340, dii: 820 },
  { date: "Mar 24", fii: 1860, dii: -180 },
  { date: "Mar 25", fii: 3120, dii: -760 },
  { date: "Mar 26", fii: -680, dii: 1240 },
  { date: "Mar 27", fii: -4367, dii: 3566 },
];

const IPO_DATA = [
  // Ongoing IPOs
  { name: "Vivid Electromech", open: "Mar 28", close: "Mar 30", gmp: "GMP +₹245", size: "₹890Cr", status: "ongoing" },
  { name: "Emiac Technologies", open: "Mar 29", close: "Mar 31", gmp: "GMP +₹178", size: "₹650Cr", status: "ongoing" },
  { name: "Amir Chand Jagdish Kumar", open: "Mar 27", close: "Mar 29", gmp: "GMP +₹456", size: "₹1,200Cr", status: "ongoing" },
  { name: "Powerica Ltd", open: "Mar 26", close: "Mar 28", gmp: "GMP +₹320", size: "₹1,500Cr", status: "ongoing" },
  { name: "Sai Parenterals", open: "Mar 25", close: "Mar 27", gmp: "GMP +₹198", size: "₹950Cr", status: "ongoing" },

  // Recently Listed IPOs
  { name: "GSP Crop Science", open: "Mar 18", close: "Mar 20", gmp: "Listed +12.45%", size: "₹2,100Cr", status: "listed" },
  { name: "Sedemac Mechatronics", open: "Mar 15", close: "Mar 17", gmp: "Listed +18.92%", size: "₹3,400Cr", status: "listed" },
  { name: "Apsis Aerocom", open: "Mar 12", close: "Mar 14", gmp: "Listed +8.67%", size: "₹1,800Cr", status: "listed" },
  { name: "Raajmarg Infra Trust", open: "Mar 10", close: "Mar 12", gmp: "Listed +7.25%", size: "₹2,500Cr", status: "listed" },
  { name: "Innovision Ltd", open: "Mar 8", close: "Mar 10", gmp: "Listed -3.14%", size: "₹1,200Cr", status: "listed" },

  // Upcoming IPOs
  { name: "Reliance Jio", open: "Apr 15", close: "Apr 18", gmp: "GMP +₹2,450", size: "₹25,000Cr", status: "upcoming" },
  { name: "Zepto", open: "May 1", close: "May 5", gmp: "GMP +₹1,850", size: "₹12,500Cr", status: "upcoming" },
  { name: "Ather Energy", open: "May 10", close: "May 14", gmp: "GMP +₹890", size: "₹3,200Cr", status: "upcoming" },
  { name: "SBI Mutual Fund", open: "Jun 1", close: "Jun 5", gmp: "GMP +₹1,250", size: "₹8,500Cr", status: "upcoming" },
  { name: "PhonePe", open: "Jun 15", close: "Jun 19", gmp: "GMP +₹2,120", size: "₹15,000Cr", status: "upcoming" },
];

const TEMPLATES = [
  { id: "daily-wrap", title: "Daily market wrap", note: "Benchmarks and session performance" },
  { id: "fii-dii", title: "Institutional flows", note: "Availability-aware flow summary" },
  { id: "sector-rotation", title: "Sector rotation", note: "Relative sector performance" },
  { id: "ipo-tracker", title: "IPO update", note: "Availability-aware issue summary" },
  { id: "top-movers", title: "Gainers & losers", note: "Ranked equity price moves" },
];
interface Briefing { title:string; wrap:string; script:string[] }
export default function VideoPage() {
  const sectors = useMarketFeed<SectorQuote[]>("/api/sectors");
  const movers = useMarketFeed<MoversResponse>("/api/movers");
  const [selected,setSelected] = useState("daily-wrap");
  const [generating,setGenerating] = useState(false);
  const [error,setError] = useState("");
  const [briefing,setBriefing] = useState<Briefing | null>(null);
  const [view,setView] = useState("Gainers");
  async function generate() {
    if(generating) return;
    setGenerating(true);setError("");setBriefing(null);
    try {
      const response = await fetch("/api/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({templateId:selected})});
      if(!response.ok) throw new Error("Unavailable");
      const result:Briefing = await response.json();setBriefing(result);
    } catch {setError("Script generation is unavailable. Check the AI service configuration or try again.");}
    finally {setGenerating(false);}
  }
  return <div className="page"><PageHeading index="05" title="Market briefing" description="Session data and factual script preparation."><span className="label-tag">SCRIPT PREVIEW</span></PageHeading>
    <div className="briefing-grid"><div className="stack"><section className="panel"><PanelHeading title="Sector performance" meta="NSE SECTORAL INDICES" />{sectors.error && <p className="notice">Sector refresh unavailable. Last retrieved values may be shown.</p>}<div className="sector-list">{sectors.data?.map(s => <div className="sector-row" key={s.name}><span>{s.name}</span><div className="sector-track" aria-hidden="true"><span className={s.change >= 0 ? "bar-positive" : "bar-negative"} style={{width:`${Math.min(Math.abs(s.change)*24,100)}%`}} /></div><strong className={`numeric ${s.change >= 0 ? "positive" : "negative"}`}>{signed(s.change)}%</strong></div>)}</div>{!sectors.data && <EmptyState>{sectors.error ? "Sector data unavailable." : "Loading sector quotes…"}</EmptyState>}<div className="panel-footer"><span>Latest available session · Yahoo Finance</span><span className="numeric">30s refresh</span></div></section>
    <section className="panel"><PanelHeading title="Equity movers" meta={`${movers.data?.coverage ?? "—"}/${movers.data?.universe ?? 100} quotes`} /><div className="toolbar"><div className="segmented" role="group" aria-label="Equity mover direction">{["Gainers","Losers"].map(label => <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div></div><MarketTable rows={(view === "Gainers" ? movers.data?.gainers : movers.data?.losers) ?? []} loading={!movers.data} error={movers.error} /></section>
    <section className="panel"><PanelHeading title="Reference archive" meta="HISTORICAL SAMPLES" /><details className="archive"><summary>Institutional flows · March 2026 sample</summary><div className="archive-content"><p className="archive-note">Historical sample data. A current institutional flow feed is not connected.</p><div className="table-scroll" role="region" aria-label="Historical institutional flow sample" tabIndex={0}><table className="data-table"><thead><tr><th scope="col">Session</th><th scope="col" className="num">FII / ₹Cr</th><th scope="col" className="num">DII / ₹Cr</th></tr></thead><tbody>{FII_DII_DATA.map(row => <tr key={row.date}><th scope="row">{row.date}</th><td className={`num numeric ${row.fii >= 0 ? "positive" : "negative"}`}>{signed(row.fii,0)}</td><td className={`num numeric ${row.dii >= 0 ? "positive" : "negative"}`}>{signed(row.dii,0)}</td></tr>)}</tbody></table></div></div></details><details className="archive"><summary>IPO calendar · historical sample</summary><div className="archive-content"><p className="archive-note">Sample issue dates and premiums are not a current IPO calendar.</p><div className="table-scroll" role="region" aria-label="Historical IPO sample" tabIndex={0}><table className="data-table"><thead><tr>{["Company","Status","Open","Close","Premium","Issue size"].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{IPO_DATA.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.status}</td><td className="numeric">{row.open}</td><td className="numeric">{row.close}</td><td className="numeric">{row.gmp}</td><td className="num numeric">{row.size}</td></tr>)}</tbody></table></div></div></details></section>
    </div><aside className="stack"><section className="panel"><PanelHeading title="Briefing template" meta="SELECT ONE" /><div className="template-list">{TEMPLATES.map((template,i) => <button className="template-button" key={template.id} aria-pressed={selected === template.id} disabled={generating} onClick={() => {setSelected(template.id);setBriefing(null);setError("");}}><span className="numeric">{String(i+1).padStart(2,"0")}</span><span><strong>{template.title}</strong><small>{template.note}</small></span></button>)}</div><div className="panel-body"><button className="btn btn-primary" onClick={() => void generate()} disabled={generating}><FileText size={14} aria-hidden="true" />{generating ? "Generating script…" : "Generate script"}</button></div>{generating && <p className="notice" role="status">Fetching quotes and preparing the script.</p>}{error && <p className="notice error-notice" role="alert">{error}</p>}<div className="panel-footer">Text preview · video encoding is not connected</div></section>
    <section className="panel"><PanelHeading title="Script preview" meta={briefing ? "READY" : "AWAITING GENERATION"} />{briefing ? <div className="script-preview"><h3>{briefing.title}</h3><SafeMarkdown>{briefing.wrap}</SafeMarkdown><ol>{briefing.script.map((line,i) => <li key={i}>{line}</li>)}</ol></div> : <EmptyState>Select a template and generate a briefing from available market data.</EmptyState>}</section></aside></div>
  </div>;
}
