import type { CorporateInfoResponse } from "@/lib/corporate-types";

export const corporateSymbol = (symbol: string) => symbol.trim().toUpperCase().replace(/\.NS$/, "");
export function filterCorporateInfo(data: CorporateInfoResponse, symbols: readonly string[], search = ""): CorporateInfoResponse {
  const allowed = new Set(symbols.map(corporateSymbol));
  const keyword = search.trim().toLowerCase();
  const matches = (row: {symbol:string; companyName:string}, detail: string) => allowed.has(row.symbol) && `${row.symbol} ${row.companyName} ${detail}`.toLowerCase().includes(keyword);
  return { ...data,
    announcements:data.announcements.filter(row=>matches(row,row.subject)),
    actions:data.actions.filter(row=>matches(row,row.purpose)),
    results:data.results.filter(row=>matches(row,`${row.audited} ${row.cumulative}`)),
  };
}
/** NSE's zone-less timestamps are IST; do not interpret them in the browser's timezone. */
export function corporateTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const match = /^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match) return null;
  const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(match[2].toLowerCase())+1;
  if (!month) return null;
  const day = `${match[3]}-${String(month).padStart(2,"0")}-${match[1].padStart(2,"0")}`;
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==day) return null;
  const stamp = `${day}T${match[4] ?? "00"}:${match[5] ?? "00"}:${match[6] ?? "00"}+05:30`;
  return Number.isFinite(Date.parse(stamp)) ? new Date(stamp).toISOString() : null;
}
export function upcomingExDate(exDate: string, now: number): boolean {
  const timestamp = corporateTimestamp(exDate);
  if (!timestamp) return false;
  const today = new Date(now+330*60_000).toISOString().slice(0,10);
  return new Date(Date.parse(timestamp)+330*60_000).toISOString().slice(0,10) >= today;
}
