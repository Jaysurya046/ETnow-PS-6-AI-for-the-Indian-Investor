import { staleFeedCache } from "@/lib/cache";
import { dateKey, displayDate, nseJson, numberValue, rows } from "@/lib/nse";
import type { FiiDiiRecord, FiiDiiResponse } from "@/lib/feed-types";
import snapshot from "@/lib/data/nse-flows-snapshot.json";
import archive from "@/lib/data/institutional-history-snapshot.json";

const HISTORY_URL = "https://upstox.com/fii-dii-data/";
const net = (buy: number, sell: number) => Math.round((buy - sell) * 100) / 100;

export function parseFlows(payload: unknown, asOf: string): FiiDiiRecord[] {
  const sessions = new Map<string, Partial<Record<"fii" | "dii", { buy: number; sell: number }>>>();
  for (const row of rows(payload)) {
    const date = dateKey(row.date);
    const category = row.category === "FII/FPI" ? "fii" : row.category === "DII" ? "dii" : null;
    const buy = numberValue(row.buyValue), sell = numberValue(row.sellValue);
    if (!date || !category || buy === undefined || sell === undefined || buy < 0 || sell < 0) continue;
    const session = sessions.get(date) ?? {};
    session[category] = { buy, sell }; sessions.set(date, session);
  }
  return [...sessions].flatMap(([date, { fii, dii }]) => fii && dii ? [{
    date: displayDate(date), fiiBuy: fii.buy, fiiSell: fii.sell, fiiNet: net(fii.buy, fii.sell),
    diiBuy: dii.buy, diiSell: dii.sell, diiNet: net(dii.buy, dii.sell), asOf,
  }] : []).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function parseHistory(cells: string[][], asOf: string): FiiDiiRecord[] {
  const payload = cells.filter(row => row.length === 7).flatMap(row => [
    { date: row[0], category: "FII/FPI", buyValue: row[1], sellValue: row[2] },
    { date: row[0], category: "DII", buyValue: row[4], sellValue: row[5] },
  ]);
  return parseFlows(payload, asOf);
}

export function mergeFlows(...groups: FiiDiiRecord[][]): FiiDiiRecord[] {
  const unique = new Map<string, FiiDiiRecord>();
  for (const group of groups) for (const row of group) unique.set(row.date, row);
  return [...unique.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).slice(-30);
}

export function flowsTtl(now = new Date()): number {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const hour = ist.getUTCHours(), day = ist.getUTCDay();
  const active = day > 0 && day < 6 && hour >= 9 && hour < 18;
  const ttl = (active ? 2 : 12) * 3_600_000;
  // A daytime cache must refresh at publication time, rather than masking the close.
  const boundary = new Date(ist);
  boundary.setUTCHours(hour < 9 ? 9 : hour < 18 ? 18 : 33, 0, 0, 0);
  return Math.min(ttl, boundary.getTime() - ist.getTime());
}

let history = mergeFlows(parseHistory(archive.rows, archive.asOf), parseFlows(snapshot.records, snapshot.asOf));
const seed: FiiDiiResponse = { history, latest: history[history.length - 1], asOf: snapshot.asOf, isStale: true, historySource: HISTORY_URL };

async function publishedHistory(asOf: string) {
  const response = await fetch(HISTORY_URL, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
  if (!response.ok) throw new Error("History unavailable");
  const html = await response.text();
  // Only the first (cash market) table; derivatives tables have different semantics.
  const table = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0] ?? "";
  const cells = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match =>
    [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1].replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "").trim()));
  const parsed = parseHistory(cells, asOf);
  if (!parsed.length) throw new Error("History schema unavailable");
  return parsed;
}

export const getInstitutionalFlows = staleFeedCache(async (): Promise<FiiDiiResponse> => {
  const asOf = new Date().toISOString();
  const [current, backfill] = await Promise.allSettled([nseJson("/api/fiidiiTradeReact"), publishedHistory(asOf)]);
  if (backfill.status === "fulfilled") history = mergeFlows(history, backfill.value);
  if (current.status === "rejected") throw new Error("NSE flows unavailable");
  const latest = parseFlows(current.value, asOf);
  if (!latest.length) throw new Error("Incomplete NSE flows");
  history = mergeFlows(history, latest);
  return { history, latest: history[history.length - 1], asOf, isStale: false, historySource: HISTORY_URL };
}, seed, flowsTtl);
