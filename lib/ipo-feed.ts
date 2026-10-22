import { staleFeedCache } from "@/lib/cache";
import { dateKey, displayDate, nseJson, numberValue, rows } from "@/lib/nse";
import type { IpoIssue, IpoResponse } from "@/lib/feed-types";
import snapshot from "@/lib/data/nse-ipo-snapshot.json";
import yahooFinance from "@/lib/yahoo";

interface IpoSources { current: unknown; upcoming: unknown; past: unknown }
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
function priceBand(value: unknown): string {
  const formatted = text(value).replace(/Rs\.?\s*/gi, "₹").replace(/\s+to\s+/gi, " – ")
    .replace(/\d[\d,]*(?:\.\d+)?/g, number => Number(number.replaceAll(",", "")).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
  return /^\d/.test(formatted) ? `₹${formatted}` : formatted || "—";
}

export function categorizeIpos(sources: IpoSources, asOf: string): IpoResponse {
  const today = new Date(new Date(asOf).getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const issues = new Map<string, IpoIssue>();
  for (const [source, payload] of [["past", sources.past], ["upcoming", sources.upcoming], ["current", sources.current]] as const) {
    for (const row of rows(payload)) {
      const symbol = text(row.symbol), name = text(row.companyName ?? row.company);
      const security = text(row.securityType ?? row.series);
      if (!symbol || !name || (security && !["EQ", "SME", "BE"].includes(security))) continue;
      const open = dateKey(row.issueStartDate ?? row.ipoStartDate);
      const close = dateKey(row.issueEndDate ?? row.ipoEndDate);
      const listing = dateKey(row.listingDate);
      const listingTime = listing ? Date.parse(`${listing}T09:15:00+05:30`) : Infinity;
      // Past issues includes old securities admitted again years after their IPO.
      if (source === "past" && close && listing && Date.parse(listing) - Date.parse(close) > 30 * 86400_000) continue;
      // Closed bidding does not prove listing. Require a published listing date.
      const status = source === "past" ? listing && listingTime <= Date.parse(asOf) ? "listed" : null
        : open && open > today ? "upcoming" : open && close && close >= today ? "ongoing" : null;
      if (!status) continue;
      const previous = issues.get(symbol);
      const shareCount = numberValue(row.issueSize);
      const issue: IpoIssue = {
        symbol, name, status,
        openDate: open ? displayDate(open) : "—", closeDate: close ? displayDate(close) : "—",
        priceBand: priceBand(row.priceRange ?? row.issuePrice),
        // NSE issueSize is a share count, not rupees. Preserve the published unit.
        issueSize: shareCount !== undefined && shareCount > 0 ? `${shareCount.toLocaleString("en-IN")} shares` : previous?.issueSize ?? "—",
        ...(listing ? { listingDate: displayDate(listing) } : {}),
        ...(previous?.subscription ? { subscription: previous.subscription } : {}),
      };
      const multiple = numberValue(row.noOfTime);
      const category = text(row.category).toLowerCase();
      const key = category === "total" ? "total" : category.includes("qualified") || category === "qib" ? "qib"
        : category.includes("non-institutional") || category === "nii" ? "nii" : category.includes("retail") ? "retail" : null;
      if (key && multiple !== undefined && multiple >= 0) issue.subscription = { ...issue.subscription, [key]: multiple };
      issues.set(symbol, issue);
    }
  }
  const all = [...issues.values()];
  return {
    ongoing: all.filter(i => i.status === "ongoing").sort((a,b) => Date.parse(a.closeDate) - Date.parse(b.closeDate)),
    upcoming: all.filter(i => i.status === "upcoming").sort((a,b) => Date.parse(a.openDate) - Date.parse(b.openDate)),
    listed: all.filter(i => i.status === "listed").sort((a,b) => Date.parse(b.listingDate!) - Date.parse(a.listingDate!)).slice(0, 10),
    asOf, isStale: false,
  };
}

async function listingGain(issue: IpoIssue, past: Record<string, unknown>[]): Promise<IpoIssue> {
  const record = past.find(row => row.symbol === issue.symbol);
  const issuePrice = numberValue(record?.issuePrice), day = dateKey(record?.listingDate);
  if (!day || !issuePrice || issuePrice <= 0 || !/^[A-Z0-9&-]{1,30}$/.test(issue.symbol)) return issue;
  try {
    const period1 = new Date(`${day}T00:00:00+05:30`);
    const period2 = new Date(period1.getTime() + 86400_000);
    // Historical listing-day close, never today's quote masquerading as a listing gain.
    const result = await yahooFinance.chart(`${issue.symbol}.NS`, { period1, period2, interval: "1d" }, { fetchOptions: { signal: AbortSignal.timeout(6_000) } });
    const bar = result.quotes.find(q => new Date(q.date.getTime() + 330 * 60_000).toISOString().slice(0,10) === day);
    const sessionClose = new Date(`${day}T15:30:00+05:30`).getTime();
    if (!bar?.close || !Number.isFinite(bar.close) || sessionClose > Date.now()) return issue;
    const delta = (bar.close / issuePrice - 1) * 100;
    return { ...issue, listingGain: `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%` };
  } catch { return issue; }
}

const seed = { ...categorizeIpos(snapshot, snapshot.asOf), isStale: true };
export const getIpos = staleFeedCache(async (): Promise<IpoResponse> => {
  const [current, upcoming, past] = await Promise.all([
    nseJson("/api/ipo-current-issue"), nseJson("/api/all-upcoming-issues?category=ipo"), nseJson("/api/public-past-issues"),
  ]);
  const result = categorizeIpos({ current, upcoming, past }, new Date().toISOString());
  // Bounded batches avoid fanning out unbounded quote requests.
  for (let start = 0; start < result.listed.length; start += 3) {
    const batch = await Promise.all(result.listed.slice(start, start + 3).map(issue => listingGain(issue, rows(past))));
    result.listed.splice(start, batch.length, ...batch);
  }
  return result;
}, seed, () => 3_600_000);
