"use client";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { InstitutionalFlows, IpoIntelligence } from "@/components/InstitutionalFeeds";
import VideoStudio from "@/components/video/VideoStudio";
import { videoFromFeeds, type VideoBriefing } from "@/lib/video";
import type { FiiDiiResponse } from "@/lib/feed-types";
import SafeMarkdown from "@/components/SafeMarkdown";
import MarketTable from "@/components/MarketTable";
import { PageHeading, PanelHeading, EmptyState, signed } from "@/components/Terminal";
import { useMarketFeed, type SectorQuote, type MoversResponse, type MarketQuote } from "@/lib/useMarketFeed";

const TEMPLATES = [
  { id: "daily-wrap", title: "Daily market wrap", note: "Benchmarks and session performance" },
  { id: "fii-dii", title: "Institutional flows", note: "Availability-aware flow summary" },
  { id: "sector-rotation", title: "Sector rotation", note: "Relative sector performance" },
  { id: "ipo-tracker", title: "IPO update", note: "Availability-aware issue summary" },
  { id: "top-movers", title: "Gainers & losers", note: "Ranked equity price moves" },
];
export default function VideoPage() {
  const quotes = useMarketFeed<MarketQuote[]>("/api/market");
  const flows = useMarketFeed<FiiDiiResponse>("/api/fii-dii",5*60_000);
  const sectors = useMarketFeed<SectorQuote[]>("/api/sectors");
  const movers = useMarketFeed<MoversResponse>("/api/movers");
  const [selected,setSelected] = useState("daily-wrap");
  const [generating,setGenerating] = useState(false);
  const [error,setError] = useState("");
  const [briefing,setBriefing] = useState<VideoBriefing | null>(null);
  const [view,setView] = useState("Gainers");
  const liveProps = useMemo(()=>videoFromFeeds({quotes:quotes.data ?? [],movers:movers.data,sectors:sectors.data ?? [],flows:flows.data,capturedAt:quotes.data?new Date().toISOString():""}),[quotes.data,movers.data,sectors.data,flows.data]);
  async function generate() {
    if(generating) return;
    setGenerating(true);setError("");setBriefing(null);
    try {
      const response = await fetch("/api/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({templateId:selected})});
      if(!response.ok) throw new Error("Unavailable");
      const result:VideoBriefing = await response.json();setBriefing(result);
    } catch {setError("Script generation is unavailable. Check the AI service configuration or try again.");}
    finally {setGenerating(false);}
  }
  return <div className="page"><PageHeading index="05" title="Video production" description="Market snapshots, factual scripts and frame-accurate video exports."><span className="label-tag">45-SECOND VIDEO</span></PageHeading>
    <VideoStudio inputProps={briefing?.videoProps ?? liveProps} generating={generating} />
    <div className="briefing-grid"><div className="stack"><section className="panel"><PanelHeading title="Sector performance" meta="NSE SECTORAL INDICES" />{sectors.error && <p className="notice">Sector refresh unavailable. Last retrieved values may be shown.</p>}<div className="sector-list">{sectors.data?.map(s => <div className="sector-row" key={s.name}><span>{s.name}</span><div className="sector-track" aria-hidden="true"><span className={s.change >= 0 ? "bar-positive" : "bar-negative"} style={{width:`${Math.min(Math.abs(s.change)*24,100)}%`}} /></div><strong className={`numeric ${s.change >= 0 ? "positive" : "negative"}`}>{signed(s.change)}%</strong></div>)}</div>{!sectors.data && <EmptyState>{sectors.error ? "Sector data unavailable." : "Loading sector quotes…"}</EmptyState>}<div className="panel-footer"><span>Latest available session · Yahoo Finance</span><span className="numeric">30s refresh</span></div></section>
    <section className="panel"><PanelHeading title="Equity movers" meta={`${movers.data?.coverage ?? "—"}/${movers.data?.universe ?? 100} quotes`} /><div className="toolbar"><div className="segmented" role="group" aria-label="Equity mover direction">{["Gainers","Losers"].map(label => <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div></div><MarketTable rows={(view === "Gainers" ? movers.data?.gainers : movers.data?.losers) ?? []} loading={!movers.data} error={movers.error} /></section>
    <InstitutionalFlows /><IpoIntelligence />
    </div><aside className="stack"><section className="panel"><PanelHeading title="Briefing template" meta="SELECT ONE" /><div className="template-list">{TEMPLATES.map((template,i) => <button className="template-button" key={template.id} aria-pressed={selected === template.id} disabled={generating} onClick={() => {setSelected(template.id);setBriefing(null);setError("");}}><span className="numeric">{String(i+1).padStart(2,"0")}</span><span><strong>{template.title}</strong><small>{template.note}</small></span></button>)}</div><div className="panel-body"><button className="btn btn-primary" onClick={() => void generate()} disabled={generating}><FileText size={14} aria-hidden="true" />{generating ? "Generating script…" : "Generate script"}</button></div>{generating && <p className="notice" role="status">Fetching quotes and preparing the script.</p>}{error && <p className="notice error-notice" role="alert">{error}</p>}<div className="panel-footer">Generate a script, review the scenes, then export the video.</div></section>
    <section className="panel"><PanelHeading title="Script transcript" meta={briefing ? briefing.videoProps.scriptSource === "ai" ? "AI SCRIPT" : "FACTUAL FALLBACK" : "AWAITING GENERATION"} />{briefing ? <div className="script-preview"><h3>{briefing.title}</h3><SafeMarkdown>{briefing.wrap}</SafeMarkdown><ol>{briefing.script.map((line,i) => <li key={i}>{line}</li>)}</ol></div> : <EmptyState>Select a template and generate a briefing from available market data.</EmptyState>}</section></aside></div>
  </div>;
}
