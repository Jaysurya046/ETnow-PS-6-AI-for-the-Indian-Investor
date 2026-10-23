import { nseJson, rows } from "@/lib/nse";
import { staleFeedCache } from "@/lib/cache";
import { corporateSymbol, corporateTimestamp } from "@/lib/corporate-utils";
import type { CorporateInfoResponse, CorporateTab, CorporateAnnouncement, CorporateAction, FinancialResult } from "@/lib/corporate-types";
import snapshot from "@/lib/data/corporate-info-fallback.json";

const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0,2000) : "";
export function corporateAttachment(value: unknown): string | undefined {
  try {
    const url = new URL(text(value));
    return url.protocol === "https:" && ["nsearchives.nseindia.com","archives.nseindia.com","www.nseindia.com"].includes(url.hostname) && !url.username && !url.password && !url.pathname.endsWith("/-") ? url.href : undefined;
  } catch { return undefined; }
}
export function parseCorporateInfo(tab: CorporateTab, payload: unknown, asOf: string): CorporateInfoResponse {
  const result: CorporateInfoResponse = {announcements:[],actions:[],results:[],asOf,isStale:false};
  const seen = new Set<string>();
  for (const row of rows(payload).slice(0,20000)) {
    const symbol = corporateSymbol(text(row.symbol));
    const companyName = text(row.sm_name ?? row.comp ?? row.companyName);
    if (!/^[A-Z0-9&-]{1,30}$/.test(symbol) || !companyName) continue;
    if (tab === "announcements") {
      const subject = text(row.desc ?? row.subject);
      const broadcastDate = corporateTimestamp(row.an_dt ?? row.broadcastDate);
      if (!subject || !broadcastDate) continue;
      const attachmentUrl = corporateAttachment(row.attchmntFile);
      const record: CorporateAnnouncement = {id:`ann-${text(String(row.seq_id ?? "")) || `${symbol}-${broadcastDate}-${subject}`}`,symbol,companyName,subject,broadcastDate,
        hasPdf:!!attachmentUrl && /\.pdf(?:\?|$)/i.test(attachmentUrl),...(attachmentUrl ? {attachmentUrl} : {}),
        ...(text(row.attFileSize ?? row.fileSize) ? {attachmentSize:text(row.attFileSize ?? row.fileSize)} : {})};
      if (!seen.has(record.id)) { result.announcements.push(record);seen.add(record.id); }
    } else if (tab === "actions") {
      const purpose = text(row.subject ?? row.purpose), series = text(row.series);
      if (!purpose || series !== "EQ") continue;
      const exDate = corporateTimestamp(row.exDate) ? text(row.exDate) : "Unavailable";
      const recordDate = corporateTimestamp(row.recDate ?? row.recordDate) ? text(row.recDate ?? row.recordDate) : "Unavailable";
      const record: CorporateAction = {id:`act-${symbol}-${exDate}-${recordDate}-${purpose}`,symbol,companyName,purpose,series,exDate,recordDate};
      if (!seen.has(record.id)) { result.actions.push(record);seen.add(record.id); }
    } else {
      const audit = text(row.audited).toLowerCase().replace(/[^a-z]/g,"");
      const consolidation = text(row.consolidated).toLowerCase().replace(/[^a-z]/g,"");
      const broadcastDate = corporateTimestamp(row.broadCastDate ?? row.broadcastDate);
      if (!["audited","unaudited"].includes(audit) || !["consolidated","nonconsolidated","standalone"].includes(consolidation) || !broadcastDate) continue;
      const attachmentUrl = corporateAttachment(row.xbrl);
      const record: FinancialResult = {id:`res-${text(String(row.seqNumber ?? "")) || `${symbol}-${broadcastDate}-${consolidation}`}`,symbol,companyName,
        audited:audit === "audited" ? "Audited" : "Unaudited",cumulative:consolidation === "consolidated" ? "Consolidated" : "Standalone",broadcastDate,
        hasXml:!!attachmentUrl && /\.xml(?:\?|$)/i.test(attachmentUrl),...(attachmentUrl ? {attachmentUrl} : {})};
      if (!seen.has(record.id)) { result.results.push(record);seen.add(record.id); }
    }
  }
  result.announcements.sort((a,b)=>b.broadcastDate.localeCompare(a.broadcastDate));
  result.results.sort((a,b)=>b.broadcastDate.localeCompare(a.broadcastDate));
  result.actions.sort((a,b)=>(corporateTimestamp(a.exDate) ?? "9999").localeCompare(corporateTimestamp(b.exDate) ?? "9999"));
  return result;
}

export function corporateTtl(now = Date.now()): number {
  const ist = new Date(now+330*60_000), minutes = ist.getUTCHours()*60+ist.getUTCMinutes();
  const weekday = ist.getUTCDay() !== 0 && ist.getUTCDay() !== 6;
  const market = weekday && minutes >= 540 && minutes < 1080;
  const ttl = market ? 15*60_000 : 2*60*60_000;
  const boundary = weekday && minutes < 540 ? (540-minutes)*60_000 : market ? (1080-minutes)*60_000 : ttl;
  return Math.min(ttl, boundary);
}
function feedPath(tab: CorporateTab): string {
  const now = Date.now(), day = (offset: number) => new Date(now+(offset*1440+330)*60_000).toISOString().slice(0,10).split("-").reverse().join("-");
  if (tab === "results") return "/api/corporates-financial-results?index=equities&period=Quarterly";
  return `/api/${tab === "actions" ? "corporates-corporateActions" : "corporate-announcements"}?index=equities&from_date=${day(tab === "actions" ? -7 : -30)}&to_date=${day(tab === "actions" ? 90 : 0)}`;
}
// Exactly three bounded entries; symbol/search filters never create cache keys.
const feeds = Object.fromEntries((["announcements","actions","results"] as const).map(tab=>[tab,staleFeedCache(
  async()=> {
    const payload = tab === "results" ? (await Promise.all([nseJson(feedPath(tab)),nseJson("/api/corporates-financial-results?index=equities&period=Annual")])).flatMap(rows) : await nseJson(feedPath(tab));
    return parseCorporateInfo(tab,payload,new Date().toISOString());
  },
  {announcements:[],actions:[],results:[],[tab]:snapshot[tab],asOf:snapshot.asOf,isStale:true} as CorporateInfoResponse,
  corporateTtl,
)])) as Record<CorporateTab,()=>Promise<CorporateInfoResponse>>;
export const getCorporateInfo = (tab: CorporateTab) => feeds[tab]();
