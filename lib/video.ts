import type { FiiDiiResponse, IpoResponse } from "@/lib/feed-types";
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
  coverage: number | null;
  universe: number | null;
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
    coverage: Number.isInteger(input.coverage) && Number(input.coverage) >= 0 ? Number(input.coverage) : null,
    universe: Number.isInteger(input.universe) && Number(input.universe) > 0 ? Number(input.universe) : null,
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
    coverage:movers?.coverage, universe:movers?.universe,
    fiiDii: flows ? { ...flows.latest, isStale:flows.isStale } : null,
    scriptLines: [], scriptSource:"awaiting",
  });
}

export const VIDEO_TEMPLATE_DETAILS: Record<string, { title: string; emphasis: string }> = {
  "daily-wrap": { title: "Daily market wrap", emphasis: "Benchmark levels, session movers, lagging sector and actual session status" },
  "fii-dii": { title: "Institutional cash flows", emphasis: "Dated FII/FPI and DII net cash flows, combined net and stale reporting state" },
  "sector-rotation": { title: "Sector rotation", emphasis: "Best and worst reported sectors and their percentage-point spread" },
  "ipo-tracker": { title: "IPO intelligence update", emphasis: "Published ongoing subscriptions, listing-session gains and upcoming opening dates; never infer SEBI filings" },
  "top-movers": { title: "Gainers & losers", emphasis: "Leading gainer, leading loser and actual universe quote coverage" },
};

export function measuredScript(templateId: string, props: MarketVideoProps, ipos?: IpoResponse | null): string[] {
  const sectors = [...props.sectors].sort((a,b) => b.change-a.change);
  const best = sectors[0], worst = sectors.at(-1);
  const gainer = props.movers.gainers[0], loser = props.movers.losers[0];
  const net = (value: number) => `${value >= 0 ? "+" : "-"}₹${Math.abs(value).toLocaleString("en-IN", {maximumFractionDigits:2})} Cr`;
  if (templateId === "fii-dii") {
    const flow = props.fiiDii;
    return flow ? [
      `FII/FPI net cash flow: ${net(flow.fiiNet)}. ${flow.fiiNet >= 0 ? "Net purchases" : "Net sales"}.`,
      `DII net cash flow: ${net(flow.diiNet)}. ${flow.diiNet >= 0 ? "Net purchases" : "Net sales"}.`,
      `Combined net: ${net(flow.fiiNet+flow.diiNet)} for ${flow.date}.${flow.isStale ? " Stale cached report." : " Verified closing report."}`,
    ] : ["FII/FPI cash-flow figures are unavailable.", "DII cash-flow figures are unavailable.", "No combined institutional posture can be calculated without verified closing reports."];
  }
  if (templateId === "sector-rotation") return [
    best ? `${best.name} leads reported sectors at ${videoSigned(best.change)}%.` : "Leading sector performance is unavailable.",
    worst ? `${worst.name} is the weakest reported sector at ${videoSigned(worst.change)}%.` : "Lagging sector performance is unavailable.",
    best && worst ? `Reported sector spread: ${(best.change-worst.change).toFixed(2)} percentage points across ${sectors.length} indices.` : "Sector spread is unavailable without index quotes.",
  ];
  if (templateId === "top-movers") return [
    gainer ? `${gainer.symbol} is the leading reported gainer at ${videoSigned(gainer.pct)}%.` : "No advancing stocks were reported in the available universe.",
    loser ? `${loser.symbol} is the leading reported loser at ${videoSigned(loser.pct)}%.` : "No declining stocks were reported in the available universe.",
    props.coverage !== null && props.universe !== null ? `${props.coverage}/${props.universe} universe quotes reported; ranks use available quotes only.` : "Universe quote coverage is unavailable; displayed movers are a partial snapshot.",
  ];
  if (templateId === "ipo-tracker") {
    if (!ipos) return ["Ongoing IPO bidding data is unavailable.", "Recent listing-session gains are unavailable.", "Upcoming issue opening dates are unavailable; no filings are inferred."];
    const leading = [...ipos.ongoing].filter(issue => Number.isFinite(issue.subscription?.total)).sort((a,b) => b.subscription!.total!-a.subscription!.total!)[0];
    const listed = [...ipos.listed].sort((a,b) => (Date.parse(b.listingDate ?? "") || 0)-(Date.parse(a.listingDate ?? "") || 0))[0];
    const upcoming = [...ipos.upcoming].sort((a,b) => (Date.parse(a.openDate) || Infinity)-(Date.parse(b.openDate) || Infinity))[0];
    return [
      `${ipos.ongoing.length} ongoing IPO bids.${leading ? ` ${leading.symbol}: ${leading.subscription!.total!.toFixed(2)}x total subscription.` : " Total subscription figures unavailable."}`,
      listed ? `${listed.symbol}: ${listed.listingGain ?? "listing-session gain unavailable"}${listed.listingDate ? `; listed ${listed.listingDate}` : "; listing date unavailable"}.` : "No recent listings were reported.",
      `${upcoming ? `Next published issue: ${upcoming.symbol}, opens ${upcoming.openDate || "date unavailable"}.` : "No upcoming opening dates reported."}${ipos.isStale ? ` Cached ${ipos.asOf.slice(0,10)}.` : ""}`,
    ];
  }
  const benchmark = (symbol: string) => {
    const quote = props.benchmarks.find(quote => quote.symbol === symbol);
    return quote?.price != null && quote.pct !== null ? `${quote.name} ${quote.price.toLocaleString("en-IN")} (${videoSigned(quote.pct)}%)` : `${symbol === "^NSEI" ? "NIFTY 50" : "SENSEX"} unavailable`;
  };
  const changes = props.benchmarks.flatMap(quote => quote.pct === null ? [] : [quote.pct]);
  const tone = !changes.length ? "Benchmark tone unavailable" : changes.every(change => change >= 0) ? "Benchmarks non-negative" : changes.every(change => change <= 0) ? "Benchmarks non-positive" : "Mixed benchmarks";
  return [
    `${benchmark("^NSEI")}; ${benchmark("^BSESN")}.`,
    `${gainer ? `${gainer.symbol} leads gainers at ${videoSigned(gainer.pct)}%` : "Gainer data unavailable"}; ${worst ? `${worst.name} lags at ${videoSigned(worst.change)}%` : "lagging sector unavailable"}.`,
    `${tone}. ${props.sessionStatus === "close" ? "Reported session closed" : props.sessionStatus === "live" ? "Session in progress" : "Latest available snapshot"}; ${props.dateStr}.`,
  ];
}

export function videoFilename(props: MarketVideoProps, format: "mp4" | "webm"): string {
  const timestamp = props.capturedAt || new Date().toISOString();
  const day = new Date(Date.parse(timestamp) + 330*60_000).toISOString().slice(0,10);
  return `etnow-market-wrap-${day}.${format}`;
}
