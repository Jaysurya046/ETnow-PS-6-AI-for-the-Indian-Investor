"use client";
import Link from "next/link";
import { useState } from "react";
import type { MoverQuote } from "@/lib/useMarketFeed";
import { EmptyState, fixedQuote } from "@/components/Terminal";

export default function MarketTable({ rows, loading, error }: { rows: MoverQuote[]; loading?: boolean; error?: boolean }) {
  const [sort, setSort] = useState<"rank" | "symbol" | "change">("rank");
  const sorted = sort === "rank" ? rows : [...rows].sort((a,b) => sort === "symbol" ? a.stock.localeCompare(b.stock) : parseFloat(b.change)-parseFloat(a.change));
  return <div className="table-scroll" role="region" aria-label="Equity movers" tabIndex={0}><table className="data-table"><thead><tr><th scope="col" className="row-index">#</th><th scope="col" aria-sort={sort === "symbol" ? "ascending" : "none"}><button className="sort-button" onClick={() => setSort(sort === "symbol" ? "rank" : "symbol")}>Instrument {sort === "symbol" && "↑"}</button></th><th scope="col" className="num">Last / INR</th><th scope="col" className="num" aria-sort={sort === "change" ? "descending" : "none"}><button className="sort-button" onClick={() => setSort(sort === "change" ? "rank" : "change")}>Change % {sort === "change" && "↓"}</button></th><th scope="col">Direction</th></tr></thead><tbody>
    {sorted.map((row, i) => <tr key={row.stock}><td className="row-index numeric">{String(i+1).padStart(2,"0")}</td><th scope="row"><Link className="symbol-link" href={`/charts?symbol=${encodeURIComponent(row.stock)}`}>{row.stock}</Link></th><td className="num numeric">{fixedQuote(row.val)}</td><td className={`num numeric ${row.dir === "up" ? "positive" : "negative"}`}>{row.change}</td><td><span className={`direction ${row.dir === "up" ? "positive" : "negative"}`}>{row.dir === "up" ? "↑ Advancing" : "↓ Declining"}</span></td></tr>)}
  </tbody></table>{!rows.length && <EmptyState>{error ? "Quote feed unavailable. Try again shortly." : loading ? "Loading session quotes…" : "No instruments match this view."}</EmptyState>}</div>;
}
