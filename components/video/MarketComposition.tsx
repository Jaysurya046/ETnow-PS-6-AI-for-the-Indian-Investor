"use client";

import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { VIDEO_SCENES, normalizeVideoProps, videoSigned, type MarketVideoProps, type VideoMover } from "@/lib/video";

const C = { bg:"#080a0f", panel:"#10151d", border:"#283341", text:"#f1f5f9", muted:"#9baabb", amber:"#e0b568", green:"#10b981", red:"#f43f5e" };
const positioned = (x:number,y:number,width:number,height?:number): CSSProperties => ({ position:"absolute", left:x, top:y, width, ...(height === undefined ? {} : { height }) });
const color = (value:number | null) => value === null ? C.muted : value >= 0 ? C.green : C.red;
const amount = (value:number | null, digits=2) => value === null ? "—" : value.toLocaleString("en-IN", { minimumFractionDigits:digits, maximumFractionDigits:digits });
function Text({ x,y,width=1728,size=34,tone=C.text,children,style }: { x:number;y:number;width?:number;size?:number;tone?:string;children:ReactNode;style?:CSSProperties }) {
  return <div style={{ ...positioned(x,y,width), fontSize:size, lineHeight:1.35, color:tone, whiteSpace:"pre-wrap", overflowWrap:"anywhere", ...style }}>{children}</div>;
}
function Rule({ y }: {y:number}) { return <div style={{ ...positioned(96,y,1728,2), backgroundColor:C.border }} />; }
function Shell({ props, index, title, children }: { props:MarketVideoProps; index:number; title:string; children:ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[0,12],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <AbsoluteFill style={{ backgroundColor:C.bg, fontFamily:'"IBM Plex Mono", Consolas, monospace', fontVariantNumeric:"tabular-nums", color:C.text, opacity }}>
    <div style={{ ...positioned(96,58,72,64), backgroundColor:C.amber, color:C.bg, fontSize:38, fontWeight:600, textAlign:"center", lineHeight:"64px" }}>ET</div>
    <Text x={194} y={62} size={28} tone={C.muted}>ETNOW / MARKET INTELLIGENCE</Text>
    <Text x={1390} y={64} width={434} size={24} tone={C.muted} style={{textAlign:"right"}}>{props.dateStr}</Text>
    <Rule y={150} />
    <Text x={96} y={188} width={1600} size={48}>{title.length>54?`${title.slice(0,51)}…`:title}</Text>
    <Text x={1700} y={200} width={124} size={24} tone={C.amber} style={{textAlign:"right"}}>{String(index).padStart(2,"0")} / 04</Text>
    {children}
    <Rule y={980} />
    <Text x={96} y={1006} width={1460} size={22} tone={C.muted}>ETNow AI · Data: NSE India / Yahoo Finance · Information, not investment advice</Text>
    <Text x={1580} y={1006} width={244} size={22} tone={C.amber} style={{textAlign:"right"}}>MARKET DESK</Text>
  </AbsoluteFill>;
}
function Headline({ props }: {props:MarketVideoProps}) {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const status = props.sessionStatus === "close" ? "NSE / BSE CASH MARKET CLOSE" : props.sessionStatus === "live" ? "NSE / BSE CASH MARKET · IN SESSION" : "NSE / BSE · LATEST AVAILABLE SESSION";
  return <Shell props={props} index={1} title={props.title}>
    <Text x={96} y={290} size={27} tone={C.amber}>{status}</Text>
    {[0,1,2].map(index => {
      const row = props.benchmarks.find(row=>row.symbol === ["^NSEI","^BSESN","^NSEBANK"][index]);
      const entrance = spring({ frame:frame-index*9, fps, config:{damping:24,stiffness:100} });
      const progress = interpolate(frame-index*9,[0,60],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
      return <div key={index} style={{ ...positioned(96+index*586,384,556,360), backgroundColor:C.panel, border:`2px solid ${C.border}`, transform:`translateY(${(1-entrance)*48}px)`, opacity:entrance }}>
        <Text x={28} y={30} width={500} size={28} tone={C.muted}>{row?.name ?? ["NIFTY 50","SENSEX","BANK NIFTY"][index]}</Text>
        <Text x={28} y={108} width={500} size={58}>{amount(row?.price ?? null)}</Text>
        <Text x={28} y={214} width={500} size={37} tone={color(row?.change ?? null)}>{row?.change === null || row?.change === undefined ? "Quote unavailable" : `${videoSigned(row.change*progress)} pts`}</Text>
        <Text x={28} y={282} width={500} size={28} tone={color(row?.pct ?? null)}>{row?.pct === null || row?.pct === undefined ? "—" : `${videoSigned(row.pct)}%`}</Text>
        <Text x={28} y={328} width={500} size={16} tone={C.muted}>{row?.asOf ? `As of ${new Date(row.asOf).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",hour12:false})} IST` : "Provider timestamp unavailable"}</Text>
      </div>;
    })}
    <Text x={96} y={820} size={28} tone={C.muted}>A measured view of benchmarks, equity movers and sector performance.</Text>
    <Text x={96} y={886} size={22} tone={C.muted}>{props.capturedAt ? `Snapshot captured ${new Date(props.capturedAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",hour12:false})} IST` : "Awaiting live market snapshot"}</Text>
  </Shell>;
}
function MoverColumn({ rows,x,label,positive }: {rows:VideoMover[];x:number;label:string;positive:boolean}) {
  const frame=useCurrentFrame();
  const max = Math.max(...rows.map(row=>Math.abs(row.pct)),1);
  return <>
    <Text x={x} y={292} width={810} size={26} tone={positive?C.green:C.red}>{label}</Text>
    {rows.length ? rows.map((row,index)=> {
      const progress=interpolate(frame-index*7,[0,45],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
      return <div key={row.symbol} style={{ ...positioned(x,350+index*112,810,100), borderBottom:`1px solid ${C.border}` }}>
        <div style={{ ...positioned(0,0,760*Math.abs(row.pct)/max*progress,96), backgroundColor:positive?C.green:C.red, opacity:.10 }} />
        <Text x={16} y={12} width={360} size={30}>{row.symbol}</Text>
        <Text x={16} y={55} width={420} size={23} tone={C.muted}>₹{amount(row.price)}</Text>
        <Text x={490} y={22} width={300} size={36} tone={positive?C.green:C.red} style={{textAlign:"right"}}>{videoSigned(row.pct)}%</Text>
      </div>;
    }) : <Text x={x} y={430} width={800} size={30} tone={C.muted}>No {positive?"gainers":"losers"} reported in the available quotes.</Text>}
  </>;
}
function Movers({props}:{props:MarketVideoProps}) {
  return <Shell props={props} index={2} title="Equity movers / NIFTY 100"><MoverColumn x={96} label="TOP GAINERS" rows={props.movers.gainers} positive /><MoverColumn x={1014} label="TOP LOSERS" rows={props.movers.losers} positive={false} /></Shell>;
}
function Sectors({props}:{props:MarketVideoProps}) {
  const frame=useCurrentFrame(), max=Math.max(...props.sectors.map(row=>Math.abs(row.change)),1);
  return <Shell props={props} index={3} title="Sector rotation / institutional flows">
    <Text x={96} y={286} size={24} tone={C.muted}>RELATIVE SESSION CHANGE · NSE SECTORAL INDICES</Text>
    {props.sectors.length ? props.sectors.map((row,index)=> {
      const progress=interpolate(frame-index*5,[0,40],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
      const width=550*Math.abs(row.change)/max*progress;
      return <div key={row.name} style={positioned(96,344+index*57,1728,50)}>
        <Text x={0} y={4} width={300} size={27}>{row.name}</Text>
        <div style={{...positioned(330,4,1230,40),backgroundColor:C.panel}} />
        <div style={{...positioned(946,0,1,50),backgroundColor:C.border}} />
        <div style={{...positioned(row.change>=0?946:946-width,11,width,26),backgroundColor:color(row.change)}} />
        <Text x={1508} y={4} width={220} size={27} tone={color(row.change)} style={{textAlign:"right"}}>{videoSigned(row.change)}%</Text>
      </div>;
    }) : <Text x={96} y={430} tone={C.muted}>Sector quotes unavailable for this snapshot.</Text>}
    <div style={{...positioned(96,842,1728,100),backgroundColor:C.panel,border:`1px solid ${C.border}`}}>
      <Text x={22} y={12} width={1680} size={19} tone={C.muted}>CASH FLOWS / {props.fiiDii ? `${props.fiiDii.date}${props.fiiDii.isStale?" · STALE CACHE":""}` : "UNAVAILABLE"}</Text>
      <Text x={22} y={47} width={1680} size={30}>{props.fiiDii ? `FII: ${props.fiiDii.fiiNet>=0?"+":"−"}₹${amount(Math.abs(props.fiiDii.fiiNet))} Cr   |   DII: ${props.fiiDii.diiNet>=0?"+":"−"}₹${amount(Math.abs(props.fiiDii.diiNet))} Cr` : "No verified institutional figures available."}</Text>
    </div>
  </Shell>;
}
function Teleprompter({props}:{props:MarketVideoProps}) {
  const frame=useCurrentFrame();
  const lines=props.scriptLines.length?props.scriptLines:["Generate a briefing to prepare factual script captions from the available market data."];
  const active=Math.min(lines.length-1,Math.floor(frame/(330/lines.length)));
  const outro=interpolate(frame,[326,360],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <Shell props={props} index={4} title="The closing brief">
    <Text x={96} y={286} size={23} tone={C.amber}>{props.scriptSource === "ai" ? "AI SCRIPT / GROUNDED IN THIS SNAPSHOT" : props.scriptSource === "measured-data" ? "FACTUAL SCRIPT / AI SERVICE UNAVAILABLE" : "AWAITING SCRIPT"}</Text>
    {lines.map((line,index)=><div key={index} style={{...positioned(96,350+index*110,1728,102),borderLeft:`4px solid ${index===active?C.amber:C.border}`,opacity:index===active?1:.55}}>
      <Text x={24} y={10} width={72} size={25} tone={C.amber}>{String(index+1).padStart(2,"0")}</Text>
      <Text x={104} y={6} width={1600} size={30}>{line}</Text>
    </div>)}
    <Text x={96} y={912} size={23} tone={C.amber} style={{opacity:outro}}>ETNow AI · Data: NSE India / Yahoo Finance</Text>
  </Shell>;
}

export function MarketVideoComposition(input: MarketVideoProps) {
  const props=normalizeVideoProps(input);
  const scenes=[Headline,Movers,Sectors,Teleprompter];
  return <AbsoluteFill>{VIDEO_SCENES.map((scene,index)=> {
    const Component=scenes[index];
    return <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} name={scene.label}><Component props={props} /></Sequence>;
  })}</AbsoluteFill>;
}
