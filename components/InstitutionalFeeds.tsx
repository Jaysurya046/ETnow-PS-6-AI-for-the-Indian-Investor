"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, PanelHeading } from "@/components/Terminal";
import { useMarketFeed } from "@/lib/useMarketFeed";
import type { FiiDiiResponse, IpoIssue, IpoResponse } from "@/lib/feed-types";

function crores(value: number): string {
  return `${value < 0 ? "−" : "+"}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}Cr`;
}
function FeedStatus({ data, error, history = false }: { data: { asOf: string; isStale: boolean } | null; error: boolean; history?: boolean }) {
  const timestamp = data ? new Date(data.asOf).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
  }) : null;
  return <div className="panel-footer feed-status" role="status">
    <span>Data: NSE India · {timestamp ? <>Updated <span className="numeric">{timestamp} IST</span></> : "Awaiting feed"}{history && " · History: Upstox"}</span>
    <span className={data?.isStale || error ? "feed-stale" : "muted"}>{data?.isStale || error ? "STALE · cached data / refresh unavailable" : data ? "LATEST AVAILABLE" : "LOADING"}</span>
  </div>;
}

export function InstitutionalFlows() {
  const { data, error } = useMarketFeed<FiiDiiResponse>("/api/fii-dii", 5 * 60_000);
  return <section className="panel"><PanelHeading title="Institutional flows" meta="CASH MARKET · ₹ CRORE" />
    {data ? <>
      <div className="flow-summary"><span>Session <strong className="numeric">{data.latest.date}</strong></span>
        <span>FII net <strong className={`numeric ${data.latest.fiiNet >= 0 ? "positive" : "negative"}`}>{crores(data.latest.fiiNet)}</strong></span>
        <span>DII net <strong className={`numeric ${data.latest.diiNet >= 0 ? "positive" : "negative"}`}>{crores(data.latest.diiNet)}</strong></span>
      </div>
      <div className="flow-chart" aria-label="Daily FII and DII net flows in crore rupees; exact values follow in the session table">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 260 }}>
          <BarChart data={data.history} margin={{ top: 12, right: 12, bottom: 0, left: 4 }} accessibilityLayer>
            <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(0,6)} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} minTickGap={26} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 10 }} tickFormatter={(value: number) => value.toLocaleString("en-IN", { notation: "compact" })} axisLine={false} tickLine={false} width={52} />
            <Tooltip formatter={value => crores(Number(value))} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 0, color: "var(--text-primary)" }} cursor={{ fill: "var(--bg-subtle)" }} />
            <Legend iconType="square" iconSize={8} />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Bar dataKey="fiiNet" name="FII net" fill="var(--gold)" maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="diiNet" name="DII net" fill="var(--blue)" maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="archive"><summary>Session detail · <span className="numeric">{data.history.length}</span> trading sessions</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Institutional flow session detail"><table className="data-table"><thead><tr>
          {["Session", "FII buy", "FII sell", "FII net", "DII buy", "DII sell", "DII net"].map(label => <th scope="col" key={label} className={label === "Session" ? "" : "num"}>{label}</th>)}
        </tr></thead><tbody>{data.history.map(row => <tr key={row.date}><th scope="row" className="numeric">{row.date}</th>{(["fiiBuy", "fiiSell", "fiiNet", "diiBuy", "diiSell", "diiNet"] as const).map(key => <td key={key} className={`num numeric ${key.endsWith("Net") ? row[key] >= 0 ? "positive" : "negative" : ""}`}>{key.endsWith("Net") ? crores(row[key]) : `₹${row[key].toLocaleString("en-IN", { maximumFractionDigits: 2 })}Cr`}</td>)}</tr>)}</tbody></table></div>
      </details>
    </> : <EmptyState>{error ? "Institutional flow feed unavailable. Retrying automatically." : "Loading institutional closing figures…"}</EmptyState>}
    <FeedStatus data={data} error={error} history />
  </section>;
}

const IPO_TABS = [{ key: "ongoing", label: "Ongoing Bids" }, { key: "upcoming", label: "Upcoming Issues" }, { key: "listed", label: "Recent Listings" }] as const;
const multiple = (value?: number) => value === undefined ? "—" : `${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
function IssueRow({ issue, tab }: { issue: IpoIssue; tab: IpoIssue["status"] }) {
  return <tr><th scope="row"><span className="ipo-name">{issue.name}</span><small className="muted numeric">{issue.symbol}</small></th>
    <td className="numeric">{issue.priceBand}</td><td className="num numeric">{issue.issueSize}</td>
    {tab === "ongoing" ? <><td className="numeric">{issue.closeDate}</td>{(["qib", "nii", "retail", "total"] as const).map(key => <td className="num numeric" key={key}>{multiple(issue.subscription?.[key])}</td>)}</>
      : tab === "upcoming" ? <><td className="numeric">{issue.openDate}</td><td className="numeric">{issue.closeDate}</td></>
      : <><td className="numeric">{issue.listingDate ?? "—"}</td><td className={`num numeric ${issue.listingGain?.startsWith("+") ? "positive" : issue.listingGain ? "negative" : "muted"}`}>{issue.listingGain ?? "—"}</td></>}
  </tr>;
}
export function IpoIntelligence() {
  const { data, error } = useMarketFeed<IpoResponse>("/api/ipo", 5 * 60_000);
  const [tab, setTab] = useState<IpoIssue["status"]>("ongoing");
  const issues = data?.[tab] ?? [];
  const headers = ["Company", "Price band", "Issue size", ...(tab === "ongoing" ? ["Closes", "QIB", "NII", "Retail", "Total"] : tab === "upcoming" ? ["Opens", "Closes"] : ["Listed", "Listing gain"] )];
  return <section className="panel"><PanelHeading title="IPO intelligence" meta="NSE PUBLIC ISSUES" />
    <div className="toolbar ipo-toolbar"><div className="segmented" role="group" aria-label="IPO issue status">{IPO_TABS.map(item => <button key={item.key} aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label} <span className="numeric muted">{data?.[item.key].length ?? "—"}</span></button>)}</div></div>
    {issues.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={`${IPO_TABS.find(item => item.key === tab)?.label} IPO issues`}><table className="data-table ipo-table"><thead><tr>{headers.map((label,i) => <th scope="col" key={label} className={i === 2 || i > 3 ? "num" : ""}>{label}</th>)}</tr></thead><tbody>{issues.map(issue => <IssueRow key={issue.symbol} issue={issue} tab={tab} />)}</tbody></table></div>
      : <EmptyState>{!data ? error ? "IPO feed unavailable. Retrying automatically." : "Loading NSE issues…" : `No ${tab} issues reported in the latest available feed.`}</EmptyState>}
    <div className="panel-footer">Subscription: times subscribed · —: not published{tab === "listed" && " · Gain: listing-day close vs issue price (Yahoo Finance)"}</div>
    <FeedStatus data={data} error={error} />
  </section>;
}
