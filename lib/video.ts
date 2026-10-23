import type { FiiDiiResponse } from "@/lib/feed-types";
import type { MarketQuote, MoversResponse, SectorQuote } from "@/lib/useMarketFeed";

export const VIDEO = { width: 1920, height: 1080, fps: 30, durationInFrames: 1350 } as const;
export const VIDEO_SCENES = [
  { id: "headline", from: 0, duration: 240, label: "Market snapshot" },
  { id: "movers", from: 240, duration: 360, label: "Gainers & losers" },
  { id: "sectors", from: 600, duration: 360, label: "Sectors & flows" },
  { id: "script", from: 960, duration: 390, label: "Briefing & outro" },
] as const;
export interface VideoBenchmark { symbol: string; name: string; price: number | null; change: number | null; pct: number | null; asOf: string | null }
export interface VideoMover { symbol: string; price: number; pct: number }
export interface VideoSector { name: string; change: number }
export interface VideoFlows { date: string; fiiNet: number; diiNet: number; asOf: string; isStale: boolean }
export interface MarketVideoProps extends Record<string, unknown> {
  title: string;
  benchmarks: VideoBenchmark[];
  movers: { gainers: VideoMover[]; losers: VideoMover[] };
  sectors: VideoSector[];
  fiiDii: VideoFlows | null;
  scriptLines: string[];
  scriptSource: "ai" | "measured-data" | "awaiting";
  dateStr: string;
  capturedAt: string;
  sessionStatus: "close" | "live" | "latest";
}
export interface VideoBriefing { title: string; wrap: string; script: string[]; videoProps: MarketVideoProps }
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const clean = (value: unknown, max = 90): string => typeof value === "string" ? value.replace(/[\x00-\x1f]/g, " ").trim().slice(0,max) : "";
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const iso = (value: unknown): string | null => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
export const videoSigned = (value: number, digits = 2) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export function sceneAtFrame(frame: number) { return VIDEO_SCENES.find(scene => frame >= scene.from && frame < scene.from + scene.duration) ?? null; }

/** Validate and bound all render inputs, keeping unavailable financial values absent. */
export function normalizeVideoProps(value: unknown): MarketVideoProps {
  const input = object(value), movers = object(input.movers), flow = object(input.fiiDii);
  const parseMovers = (value: unknown, direction: 1 | -1) => array(value).flatMap(value => {
    const row = object(value), symbol = clean(row.symbol, 24), price = number(row.price), pct = number(row.pct);
    return symbol && price !== null && price > 0 && pct !== null && pct * direction > 0 ? [{ symbol, price, pct }] : [];
  }).sort((a,b) => direction * (b.pct-a.pct)).slice(0,5);
  const benchmarks = array(input.benchmarks).slice(0,3).flatMap(value => {
    const row = object(value), symbol = clean(row.symbol,30), name = clean(row.name,30);
    return symbol && name ? [{ symbol, name, price: number(row.price), change: number(row.change), pct: number(row.pct), asOf: iso(row.asOf) }] : [];
  });
  const sectors = array(input.sectors).flatMap(value => {
    const row = object(value), name = clean(row.name,24), change = number(row.change);
    return name && change !== null ? [{ name, change }] : [];
  }).sort((a,b) => b.change-a.change).slice(0,8);
  const fiiNet = number(flow.fiiNet), diiNet = number(flow.diiNet), asOf = iso(flow.asOf), date = clean(flow.date,24);
  return {
    title: clean(input.title, 72) || "Market session briefing", benchmarks,
    movers: { gainers: parseMovers(movers.gainers,1), losers: parseMovers(movers.losers,-1) }, sectors,
    fiiDii: fiiNet !== null && diiNet !== null && asOf && date ? { date, fiiNet, diiNet, asOf, isStale: flow.isStale !== false } : null,
    scriptLines: array(input.scriptLines).map(line => clean(line,150)).filter(Boolean).slice(0,5),
    scriptSource: input.scriptSource === "ai" ? "ai" : input.scriptSource === "measured-data" ? "measured-data" : "awaiting",
    dateStr: clean(input.dateStr,40) || "Session date unavailable", capturedAt: iso(input.capturedAt) || "",
    sessionStatus: input.sessionStatus === "close" ? "close" : input.sessionStatus === "live" ? "live" : "latest",
  };
}

export function videoFromFeeds({ quotes, movers, sectors, flows, capturedAt }: {
  quotes: MarketQuote[]; movers: MoversResponse | null; sectors: SectorQuote[]; flows: FiiDiiResponse | null; capturedAt: string;
}): MarketVideoProps {
  const numeric = (value: string) => { const result = Number(value.replace(/[₹$,%+]/g, "").replace("−","-").trim()); return value.trim() && Number.isFinite(result) ? result : null; };
  const selected = ["^NSEI", "^BSESN", "^NSEBANK"].flatMap(symbol => quotes.filter(q => q.symbol === symbol).slice(0,1));
  const sessionTime = selected.map(q => q.asOf).filter((time): time is string => !!time).sort().at(-1);
  const mapMovers = (rows: MoversResponse["gainers"]) => rows.map(row => ({ symbol: row.stock, price: numeric(row.val), pct: numeric(row.change) }));
  return normalizeVideoProps({
    title: "Indian markets / session briefing", capturedAt, sessionStatus: "latest",
    dateStr: sessionTime ? new Date(sessionTime).toLocaleDateString("en-IN", { timeZone:"Asia/Kolkata", day:"2-digit", month:"long", year:"numeric" }) : "Session date unavailable",
    benchmarks: selected.map(q => ({ symbol:q.symbol, name:q.name, price:numeric(q.price), change:numeric(q.change), pct:numeric(q.pct), asOf:q.asOf })),
    movers: { gainers:mapMovers(movers?.gainers ?? []), losers:mapMovers(movers?.losers ?? []) }, sectors,
    fiiDii: flows ? { ...flows.latest, isStale:flows.isStale } : null,
    scriptLines: [], scriptSource:"awaiting",
  });
}

export function measuredScript(props: MarketVideoProps): string[] {
  const benchmark = props.benchmarks[0], gainer = props.movers.gainers[0], sector = props.sectors[0];
  return [
    benchmark?.price !== null && benchmark?.price !== undefined && benchmark.pct !== null ? `${benchmark.name} is at ${benchmark.price.toLocaleString("en-IN")}, ${videoSigned(benchmark.pct)} percent for the reported session.` : "Benchmark quotes are unavailable for this snapshot.",
    gainer ? `${gainer.symbol} leads the available gainers at ${videoSigned(gainer.pct)} percent.` : "No advancing stocks were reported in the available universe.",
    sector ? `${sector.name} has the highest reported sector change at ${videoSigned(sector.change)} percent.` : "Sector performance is unavailable for this snapshot.",
  ];
}

export function videoFilename(props: MarketVideoProps, format: "mp4" | "webm"): string {
  const timestamp = props.capturedAt || new Date().toISOString();
  const day = new Date(Date.parse(timestamp) + 330*60_000).toISOString().slice(0,10);
  return `etnow-market-wrap-${day}.${format}`;
}
