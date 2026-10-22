"use client";
import SafeMarkdown from "@/components/SafeMarkdown";
import type { Mover } from "@/lib/market-data";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";

const PIPELINE = [
  { label: "Fetching market data and generating script", icon: "📡" },
  { label: "Preparing script preview", icon: "🎙️" },
  { label: "Script preview ready", icon: "✅" },
];
interface Sector { name: string; change: number; asOf: string | null }

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
  const [sectorData, setSectorData] = useState<Sector[]>([]);
  const [marketError, setMarketError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [liveScript, setLiveScript] = useState<string[]>([]);
  const [raceFrame, setRaceFrame] = useState(0);
  const [liveWrap, setLiveWrap] = useState<string | null>(null);
  const [liveMovers, setLiveMovers] = useState<Mover[]>([]);
  const [videoTitle, setVideoTitle] = useState("ET Markets Daily Wrap");
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      const results = await Promise.allSettled([
        fetch("/api/sectors", { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error("sectors"); return await r.json() as Sector[]; }),
        fetch("/api/movers", { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error("movers"); return await r.json() as { gainers: Mover[]; losers: Mover[]; coverage: number; universe: number }; }),
      ]);
      if (controller.signal.aborted) return;
      const [sectors, movers] = results;
      if (sectors.status === "fulfilled") setSectorData(sectors.value);
      if (movers.status === "fulfilled") setLiveMovers([...movers.value.gainers, ...movers.value.losers]);
      setMarketError(results.some(r => r.status === "rejected") ? "Some market data is unavailable. Last successful values may be shown." : "");
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => { controller.abort(); clearInterval(timer); };
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

    setGenerationError("");
    try {
      const res = await fetch("/api/video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      const data: { error?: string; title: string; wrap: string; script: string[]; movers: Mover[] } = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Script generation failed");
      setPipelineProgress(1);
      setLiveWrap(data.wrap); setLiveMovers(data.movers); setVideoTitle(data.title); setLiveScript(data.script);
      setPipelineProgress(2); setVideoReady(true);
    } catch {
      setGenerationError("Script generation is unavailable. Please try again."); setPipelineProgress(-1);
    } finally { setGenerating(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <span>🎬</span> AI Market Video Engine
        </div>
        <div className="page-subtitle">
          Generate a market script preview using current quotes and sector performance
        </div>
      </div>

      {marketError && <p role="status">{marketError}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Left: Visualizations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* FII / DII Race Chart */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>FII / DII Daily Flows</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Historical sample · March 2026 · ₹Crores</div>
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
                  formatter={(v) => [`₹${v}Cr`, ""]}
                />
                <Bar dataKey="fii" fill="var(--blue)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={true}>
                  <LabelList dataKey="fii" position="top" style={{ fill: "var(--text-muted)", fontSize: 9 }} formatter={(v) => `${Number(v) > 0 ? "+" : ""}${v}`} />
                </Bar>
                <Bar dataKey="dii" fill="var(--orange)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={true}>
                  <LabelList dataKey="dii" position="top" style={{ fill: "var(--text-muted)", fontSize: 9 }} formatter={(v) => `${Number(v) > 0 ? "+" : ""}${v}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Rotation Heatmap */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Sector Rotation Heatmap</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Latest available session · NSE Indices</div>
            </div>

            {sectorData.length === 0 && <p>Sector quotes unavailable or loading.</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {sectorData.map((sector, i) => {
                const color = sector.change >= 0 ? "var(--green)" : "var(--red)";
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
                      border: "1px solid var(--border-subtle)",

                    }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{sector.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "JetBrains Mono, monospace" }}>
                      {sector.change > 0 ? "+" : ""}{sector.change.toFixed(2)}%
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
                <SafeMarkdown>{liveWrap}</SafeMarkdown>
              ) : (
                <p>Generate a script to see a summary grounded in the latest available quotes.</p>
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
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Historical sample data · March 2026 · not a current IPO calendar</div>
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
            {generating ? "⚙️ Generating..." : "🎙️ Generate Script Preview"}
          </button>

          {generationError && <p role="alert">{generationError}</p>}
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

          {videoReady && (
            <div className="card animate-fade-in">
              <h3>{videoTitle}</h3>
              <p style={{ color: "var(--text-muted)" }}>Script preview · video encoding is not available</p>
              {liveScript.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
