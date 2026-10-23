import { NextResponse } from "next/server";
import { getGenAI, DEFAULT_GEMINI_MODEL, withGeminiModel } from "@/lib/gemini";
import { getMovers, getQuotes, getSectors } from "@/lib/market-data";
import { getInstitutionalFlows } from "@/lib/institutional-flows";
import { getIpos } from "@/lib/ipo-feed";
import { measuredScript, normalizeVideoProps, VIDEO_TEMPLATE_DETAILS, type VideoBriefing } from "@/lib/video";

export async function POST(req: Request) {
  let templateId: unknown;
  try { ({ templateId } = await req.json()); } catch { return NextResponse.json({error:"Invalid request"},{status:400}); }
  if (typeof templateId !== "string" || !["daily-wrap","fii-dii","sector-rotation","ipo-tracker","top-movers"].includes(templateId)) return NextResponse.json({error:"Invalid template"},{status:400});
  const template = VIDEO_TEMPLATE_DETAILS[templateId];
  const [quoteResult,moverResult,sectorResult,flowResult,ipoResult] = await Promise.allSettled([
    getQuotes(["^NSEI","^BSESN","^NSEBANK"]), getMovers(), getSectors(), getInstitutionalFlows(),
    templateId === "ipo-tracker" ? getIpos() : Promise.resolve(null),
  ]);
  const quotes=quoteResult.status === "fulfilled" ? quoteResult.value : [];
  const movers=moverResult.status === "fulfilled" ? moverResult.value : {gainers:[],losers:[],coverage:0,universe:100};
  const sectors=sectorResult.status === "fulfilled" ? sectorResult.value : [];
  const flows=flowResult.status === "fulfilled" ? flowResult.value : null;
  const asOf=quotes.map(quote=>quote.regularMarketTime?.toISOString()).filter((value):value is string=>!!value).sort().at(-1);
  const names:Record<string,string>={"^NSEI":"NIFTY 50","^BSESN":"SENSEX","^NSEBANK":"BANK NIFTY"};
  const validQuotes=quotes.filter(quote=>Number.isFinite(quote.regularMarketPrice));
  const marketStates=validQuotes.map(quote=>quote.marketState);
  const convertMovers=(rows:typeof movers.gainers)=>rows.map(row=>({symbol:row.stock,price:Number(row.val.replace(/[₹,]/g,"")),pct:Number(row.change.replace("%",""))}));
  let videoProps=normalizeVideoProps({
    title:template.title, capturedAt:new Date().toISOString(),
    sessionStatus:marketStates.length && marketStates.every(state=>state === "CLOSED" || state === "POST" || state === "POSTPOST") ? "close" : marketStates.some(state=>state === "REGULAR") ? "live" : "latest",
    dateStr:asOf ? new Date(asOf).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"long",year:"numeric"}) : "Session date unavailable",
    benchmarks:["^NSEI","^BSESN","^NSEBANK"].flatMap(symbol=> {
      const quote=validQuotes.find(quote=>quote.symbol===symbol);
      return quote ? [{symbol,name:names[symbol],price:quote.regularMarketPrice,change:quote.regularMarketChange,pct:quote.regularMarketChangePercent,asOf:quote.regularMarketTime?.toISOString()}] : [];
    }),
    movers:{gainers:convertMovers(movers.gainers),losers:convertMovers(movers.losers)},sectors,
    coverage:movers.coverage,universe:movers.universe,
    fiiDii:flows ? {...flows.latest,isStale:flows.isStale} : null, scriptLines:[],scriptSource:"measured-data",
  });
  let script=measuredScript(templateId, videoProps, ipoResult.status === "fulfilled" ? ipoResult.value : null);
  let wrap=`${template.title}: ${script.join(" ")}`;
  const ai=getGenAI();
  if(ai) {
    try {
      const response=await withGeminiModel(DEFAULT_GEMINI_MODEL, model => ai.models.generateContent({
        model,
        contents:`Prepare a 45-second ETNow market video for template ${templateId}.
Title, wrap and spoken script must focus on ${template.title}: ${template.emphasis}. Do not reuse a generic benchmark/gainer/sector script for every template.
Use ONLY this verified snapshot: ${JSON.stringify(videoProps)}.
Additional IPO context: ${JSON.stringify(ipoResult.status === "fulfilled" ? ipoResult.value : null)}.
Write 3–5 short script lines, maximum 55 words total and 150 characters per line. Do not invent news, causes, missing values, future prices or institutional activity. Identify stale flows by session date. Do not call latest-available quotes today's close unless the session status is close.
Return JSON {"title":"short factual title under 54 characters","wrap":"two factual sentences","script":["short spoken line"]}.`,
        config:{responseMimeType:"application/json",httpOptions:{timeout:20_000},abortSignal:req.signal},
      }));
      const data:unknown=JSON.parse(response.text || "{}");
      if(!data || typeof data!=="object" || !("title" in data) || typeof data.title!=="string" || !("wrap" in data) || typeof data.wrap!=="string" || !("script" in data) || !Array.isArray(data.script) || data.script.length<3 || data.script.length>5 || !data.script.every(line=>typeof line==="string" && line.trim().length>0 && line.length<=150)) throw new Error("Invalid script");
      script=data.script;wrap=`${template.title}: ${data.wrap}`.slice(0,900);
      videoProps=normalizeVideoProps({...videoProps,title:`${template.title} / ${data.title}`,scriptLines:script,scriptSource:"ai"});
    } catch { /* Keep an explicitly labelled measured-data script on quota/provider failure. */ }
  }
  if(videoProps.scriptSource!=="ai") videoProps=normalizeVideoProps({...videoProps,scriptLines:script});
  const result:VideoBriefing={title:videoProps.title,wrap,script:videoProps.scriptLines,videoProps};
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
