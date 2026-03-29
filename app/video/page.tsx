"use client";
import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

interface PipelineStep {
  label: string;
  icon: string;
  duration: number;
}

const PIPELINE: PipelineStep[] = [
  { label: "Fetching live market data", icon: "📡", duration: 1200 },
  { label: "Rendering charts & visuals", icon: "🎨", duration: 1400 },
  { label: "Generating AI voiceover script", icon: "🎙️", duration: 1600 },
  { label: "Encoding video with animations", icon: "⚙️", duration: 2000 },
  { label: "Video ready!", icon: "✅", duration: 500 },
];

const SECTOR_DATA = [
  { name: "IT", change: 0.8, color: "#22c55e" },
  { name: "Telecom", change: 0.5, color: "#22c55e" },
  { name: "Energy", change: -0.3, color: "#f97316" },
  { name: "FMCG", change: -1.2, color: "#f97316" },
  { name: "Auto", change: -2.8, color: "#ef4444" },
  { name: "PSU Banks", change: -3.4, color: "#ef4444" },
  { name: "Realty", change: -3.1, color: "#ef4444" },
  { name: "Pvt Banks", change: -2.9, color: "#ef4444" },
];

const FII_DII_DATA = [
  { date: "Mar 20", fii: 2140, dii: -240 },
  { date: "Mar 21", fii: -340, dii: 820 },
  { date: "Mar 24", fii: 1860, dii: -180 },
  { date: "Mar 25", fii: 3120, dii: -760 },
  { date: "Mar 26", fii: -680, dii: 1240 },
  { date: "Mar 27", fii: -4367, dii: 3566 },
];

const TOP_MOVERS = [
  { stock: "ONGC", change: "+4.03%", val: "₹315", dir: "up" },
  { stock: "WIPRO", change: "+1.22%", val: "₹569", dir: "up" },
  { stock: "BHARTI", change: "+0.82%", val: "₹1,234", dir: "up" },
  { stock: "SHRIRAM", change: "-5.54%", val: "₹2,180", dir: "down" },
  { stock: "TATA M", change: "-4.92%", val: "₹586", dir: "down" },
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

const VIDEO_TEMPLATES = [
  { id: "daily-wrap", title: "Daily Market Wrap", duration: "45s", icon: "📰" },
  { id: "fii-dii", title: "FII/DII Flow Report", duration: "30s", icon: "🌊" },
  { id: "sector-rotation", title: "Sector Rotation", duration: "60s", icon: "🔄" },
  { id: "ipo-tracker", title: "IPO Tracker Weekly", duration: "45s", icon: "🚀" },
  { id: "top-movers", title: "Top Gainers & Losers", duration: "30s", icon: "📊" },
];

export default function VideoPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("daily-wrap");
  const [generating, setGenerating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(-1);
  const [videoReady, setVideoReady] = useState(false);
  const [activeSectorIdx, setActiveSectorIdx] = useState(0);
  const [raceFrame, setRaceFrame] = useState(0);
  const [liveWrap, setLiveWrap] = useState<string | null>(null);
  const [liveMovers, setLiveMovers] = useState<{stock:string, change:string, val:string, dir:string}[]>(TOP_MOVERS);
  const [videoTitle, setVideoTitle] = useState("ET Markets Daily Wrap");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate sector heatmap
  useEffect(() => {
    const t = setInterval(() => {
      setActiveSectorIdx((i) => (i + 1) % SECTOR_DATA.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  // Race chart animation
  useEffect(() => {
    const t = setInterval(() => {
      setRaceFrame((f) => (f + 1) % FII_DII_DATA.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const generateVideo = async () => {
    setGenerating(true);
    setVideoReady(false);
    setPipelineProgress(0);

    const apiCall = fetch("/api/video", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selectedTemplate }) 
    }).then(r => r.json()).catch(e => console.error(e));

    for (let i = 0; i < PIPELINE.length; i++) {
      setPipelineProgress(i);
      
      if (i === 2) {
         try {
           const data = await apiCall;
           if (data && !data.error) {
              setLiveWrap(data.wrap);
              if (Array.isArray(data.movers) && data.movers.length > 0) setLiveMovers(data.movers);
              if (data.title) setVideoTitle(data.title);
           }
         } catch (e) {}
      }

      await new Promise((r) => setTimeout(r, PIPELINE[i].duration));
    }

    setGenerating(false);
    setVideoReady(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <span>🎬</span> AI Market Video Engine
        </div>
        <div className="page-subtitle">
          Auto-generate visually rich market update videos — race charts, sector rotation, IPO tracker — zero human editing
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Left: Visualizations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* FII / DII Race Chart */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>FII / DII Daily Flows</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Last 8 trading sessions · ₹Crores</div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--blue)" }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>FII</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--orange)" }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>DII</span>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={FII_DII_DATA.slice(0, raceFrame + 1)} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`₹${v}Cr`, ""]}
                />
                <Bar dataKey="fii" fill="var(--blue)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={true}>
                  <LabelList dataKey="fii" position="top" style={{ fill: "var(--text-muted)", fontSize: 9 }} formatter={(v: any) => `${v > 0 ? "+" : ""}${v}`} />
                </Bar>
                <Bar dataKey="dii" fill="var(--orange)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={true}>
                  <LabelList dataKey="dii" position="top" style={{ fill: "var(--text-muted)", fontSize: 9 }} formatter={(v: any) => `${v > 0 ? "+" : ""}${v}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Rotation Heatmap */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Sector Rotation Heatmap</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Today&apos;s performance · NSE Indices</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {SECTOR_DATA.map((sector, i) => {
                const isActive = i === activeSectorIdx;
                const intensity = Math.abs(sector.change) / 3;
                const bgColor = sector.change > 0
                  ? `rgba(34,197,94,${0.1 + intensity * 0.3})`
                  : sector.change < 0
                    ? `rgba(239,68,68,${0.1 + intensity * 0.3})`
                    : "rgba(240,180,41,0.1)";
                return (
                  <div key={i}
                    className="heatmap-cell"
                    style={{
                      background: bgColor,
                      border: isActive ? `2px solid ${sector.color}` : "1px solid transparent",
                      boxShadow: isActive ? `0 0 16px ${sector.color}40` : "none",
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{sector.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: sector.color, fontFamily: "JetBrains Mono, monospace" }}>
                      {sector.change > 0 ? "+" : ""}{sector.change}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Wrap Scroll */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>📰 Today&apos;s Market Wrap</div>
              <span className="badge badge-blue">AUTO-GENERATED</span>
            </div>
            <div style={{
              background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "16px 18px",
              fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8,
            }}>
              {liveWrap ? (
                <div dangerouslySetInnerHTML={{ __html: liveWrap.replace(/\\n/g, '<br />').replace(/\\*\\*(.*?)\\*\\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }} />
              ) : (
                <>
                  <strong style={{ color: "var(--text-primary)" }}>March 27, 2026 · Market Close Summary</strong><br /><br />
                  Indian markets snapped recovery as selling pressure returned sharply. <strong style={{ color: "var(--red)" }}>Nifty closed at 22,819.60 (↓2.09% / -487 pts)</strong>. Only 6 of 50 Nifty stocks ended in green — ONGC led at +4.03% on crude surge to $114.81, while Shriram Finance crashed -5.54% and Tata Motors -4.92%. FIIs continued aggressive exit (₹-4,367Cr) amid rising dollar and geopolitical tensions.<br /><br />
                  Broad-based selling devastated rate-sensitive sectors: PSU Banks -3.4%, Realty -3.1%, Auto -2.8%, Pvt Banks -2.9%. Only IT (+0.8%) and Telecom (+0.5%) held ground defensively. USD/INR hit ₹94.85 (all-time low), 10-Yr yield at 6.9%. Strong support at 22,450 — market in Risk-Off mode.<br /><br />
                  <strong style={{ color: "var(--gold)" }}>War Premium Alert: </strong>Macro headwinds intensifying. Gold at ₹1,48,090/10g — safe haven demand surging.
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {liveMovers.map((m, i) => (
                <div key={i} style={{
                  flex: 1, background: m.dir === "up" ? "var(--green-dim)" : "var(--red-dim)",
                  border: `1px solid ${m.dir === "up" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  borderRadius: "var(--radius-sm)", padding: "8px 10px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{m.stock}</div>
                  <div style={{ fontSize: 10, color: m.dir === "up" ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{m.change}</div>
                </div>
              ))}
            </div>
          </div>

          {/* IPO Tracker */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>🚀 IPO Tracker</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Upcoming · Ongoing · Recently Listed</div>
            </div>

            {/* Ongoing IPOs */}
            {IPO_DATA.filter(ipo => ipo.status === "ongoing").length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(240,180,41,0.2)" }}>
                  ⏳ ONGOING
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Opens</th>
                      <th>Closes</th>
                      <th>GMP</th>
                      <th>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IPO_DATA.filter(ipo => ipo.status === "ongoing").map((ipo, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ipo.name}</td>
                        <td>{ipo.open}</td>
                        <td>{ipo.close}</td>
                        <td style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{ipo.gmp}</td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace" }}>{ipo.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Listed IPOs */}
            {IPO_DATA.filter(ipo => ipo.status === "listed").length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(34,197,94,0.2)" }}>
                  ✓ LISTED
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Opens</th>
                      <th>Closes</th>
                      <th>Listing Return</th>
                      <th>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IPO_DATA.filter(ipo => ipo.status === "listed").map((ipo, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ipo.name}</td>
                        <td>{ipo.open}</td>
                        <td>{ipo.close}</td>
                        <td style={{ color: "var(--green)", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{ipo.gmp}</td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace" }}>{ipo.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Upcoming IPOs */}
            {IPO_DATA.filter(ipo => ipo.status === "upcoming").length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
                  🚀 UPCOMING
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Opens</th>
                      <th>Closes</th>
                      <th>GMP</th>
                      <th>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IPO_DATA.filter(ipo => ipo.status === "upcoming").map((ipo, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ipo.name}</td>
                        <td>{ipo.open}</td>
                        <td>{ipo.close}</td>
                        <td style={{ color: "var(--blue)", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{ipo.gmp}</td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace" }}>{ipo.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Video Generator */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Template selector */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
              Video Template
            </div>
            {VIDEO_TEMPLATES.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTemplate(t.id); setVideoReady(false); setPipelineProgress(-1); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: "var(--radius-md)", marginBottom: 8, cursor: "pointer",
                  background: selectedTemplate === t.id ? "var(--gold-dim)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selectedTemplate === t.id ? "rgba(240,180,41,0.2)" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selectedTemplate === t.id ? "var(--gold)" : "var(--text-primary)" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.duration} · Auto-generated</div>
                </div>
                {selectedTemplate === t.id && <span style={{ color: "var(--gold)", fontSize: 14 }}>✓</span>}
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            className={`btn btn-primary ${generating ? "" : "animate-glow"}`}
            style={{ justifyContent: "center", padding: "14px", fontSize: 15, fontWeight: 700 }}
            onClick={generateVideo}
            disabled={generating}
          >
            {generating ? "⚙️ Generating..." : "🎬 Generate Video"}
          </button>

          {/* Pipeline progress */}
          {pipelineProgress >= 0 && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Generation Pipeline
              </div>
              {PIPELINE.map((step, i) => {
                const isDone = i < pipelineProgress;
                const isActive = i === pipelineProgress;
                return (
                  <div key={i} className={`pipeline-step ${isDone ? "done" : isActive ? "active" : "pending"}`}>
                    <div className="step-icon-wrap" style={{
                      background: isDone ? "var(--green-dim)" : isActive ? "var(--gold-dim)" : "rgba(255,255,255,0.03)",
                    }}>
                      {isDone ? "✅" : isActive ? <span className="animate-pulse">{step.icon}</span> : step.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isDone ? "var(--green)" : isActive ? "var(--gold)" : "var(--text-muted)" }}>
                        {step.label}
                      </div>
                      {isActive && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>In progress...</div>}
                      {isDone && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 2 }}>Complete</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Video player mock */}
          {videoReady && (
            <div className="card animate-fade-in" style={{ borderColor: "rgba(240,180,41,0.3)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                🎥 Video Ready
              </div>

              <div style={{
                width: "100%", aspectRatio: "16/9",
                background: "linear-gradient(135deg, #0a0d14 0%, #0d1119 100%)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
                marginBottom: 14,
              }}>
                {/* Mock video content */}
                <div style={{ position: "absolute", top: 10, left: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--red)", letterSpacing: 1 }}>LIVE</span>
                </div>
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>0:00 / 0:45</div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)" }}>{videoTitle}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Live Generated</div>
                </div>

                {/* Progress bar */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)" }}>
                  <div style={{ height: "100%", width: "0%", background: "var(--gold)", animation: "none" }} />
                </div>

                {/* Play button overlay */}
                <div style={{
                  position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                  display: "flex", gap: 12,
                }}>
                  <button className="btn btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>▶ Play</button>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>⬇ Download</button>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>🔗 Share</button>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-primary)" }}>Daily Market Wrap</strong> · 45 seconds · 720p · Auto-captions included
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
