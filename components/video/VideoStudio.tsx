"use client";

import { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { MarketVideoComposition } from "@/components/video/MarketComposition";
import { PanelHeading } from "@/components/Terminal";
import { VIDEO, VIDEO_SCENES, normalizeVideoProps, type MarketVideoProps } from "@/lib/video";

export default function VideoStudio({inputProps,generating}:{inputProps:MarketVideoProps;generating:boolean}) {
  const player=useRef<PlayerRef>(null);
  const controller=useRef<AbortController | null>(null);
  const urlRef=useRef<string | null>(null);
  const [snapshot,setSnapshot]=useState<MarketVideoProps | null>(null);
  const [progress,setProgress]=useState<number | null>(null);
  const [error,setError]=useState("");
  const [output,setOutput]=useState<{url:string;filename:string;bytes:number} | null>(null);
  const [metadata,setMetadata]=useState("");
  const busy=progress!==null && progress<100;
  useEffect(()=>()=>{controller.current?.abort();if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
  async function renderVideo() {
    if(controller.current) return;
    const job=new AbortController();controller.current=job;
    const frozen=normalizeVideoProps(inputProps);
    setSnapshot(frozen);setProgress(0);setError("");setMetadata("");player.current?.pause();
    try {
      const {exportMarketVideo}=await import("@/lib/video-export");
      job.signal.throwIfAborted();
      const result=await exportMarketVideo(frozen,job.signal,value=>{if(!job.signal.aborted)setProgress(value);});
      if(job.signal.aborted)return;
      if(urlRef.current)URL.revokeObjectURL(urlRef.current);
      const url=URL.createObjectURL(result.blob);urlRef.current=url;
      setOutput({url,filename:result.filename,bytes:result.blob.size});
      const anchor=document.createElement("a");anchor.href=url;anchor.download=result.filename;document.body.append(anchor);anchor.click();anchor.remove();
    } catch(reason) {
      if(!job.signal.aborted) setError(reason instanceof Error?reason.message:"Encoding failed. Please try again.");
      setProgress(null);
    } finally {controller.current=null;setSnapshot(null);}
  }
  const ready=inputProps.scriptLines.length>0 && (inputProps.benchmarks.some(row=>row.price!==null) || inputProps.movers.gainers.length>0 || inputProps.movers.losers.length>0 || inputProps.sectors.length>0);
  return <section className="panel video-studio"><PanelHeading title="Broadcast preview" meta="1080P / 30 FPS / 45 SEC" />
    <div className="video-player-shell"><Player ref={player} component={MarketVideoComposition} inputProps={snapshot ?? inputProps}
      durationInFrames={VIDEO.durationInFrames} fps={VIDEO.fps} compositionWidth={VIDEO.width} compositionHeight={VIDEO.height}
      style={{width:"100%",aspectRatio:"16 / 9"}} initialFrame={90} controls loop clickToPlay={!busy} doubleClickToFullscreen allowFullscreen
      acknowledgeRemotionLicense
    /></div>
    <div className="video-scene-controls" role="group" aria-label="Preview video scene">{VIDEO_SCENES.map((scene,index)=><button type="button" key={scene.id} disabled={busy} onClick={()=>{player.current?.pause();player.current?.seekTo(scene.from+90);}}><span className="numeric">0{index+1}</span> {scene.label}</button>)}</div>
    <div className="video-export-toolbar"><div><button type="button" className="btn btn-primary" disabled={busy || generating || !ready} onClick={()=>void renderVideo()}>{busy?`Encoding: ${progress}%…`:"Export video"}</button>
      {busy && <button type="button" className="btn btn-ghost" onClick={()=>{controller.current?.abort();setProgress(null);setSnapshot(null);}}>Cancel</button>}
      {output && !busy && <a className="btn btn-ghost" href={output.url} download={output.filename}>Download again</a>}</div>
      <span className="panel-meta">Silent video · script captions · MP4 / WebM</span>
    </div>
    {busy && <div className="video-progress" role="progressbar" aria-label="Video encoding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}><span style={{width:`${progress}%`}} /></div>}
    {error && <p className="notice error-notice" role="alert">{error}</p>}
    {output && <details className="encoded-review"><summary>Review encoded file <span className="numeric">{(output.bytes/1_048_576).toFixed(1)} MB{metadata?` · ${metadata}`:""}</span></summary>
      <video src={output.url} controls preload="metadata" aria-label="Encoded market wrap" onLoadedMetadata={event=>{const video=event.currentTarget;setMetadata(`${video.duration.toFixed(2)}s · ${video.videoWidth}×${video.videoHeight}`);}} />
    </details>}
    <div className="panel-footer" role="status">{busy?"Encoding the frozen preview snapshot. Keep this tab open.":progress===100?"Video encoded. Download is ready.":inputProps.scriptSource==="ai"?"AI script grounded in the captured market snapshot.":inputProps.scriptSource==="measured-data"?"Measured-data script fallback. AI service unavailable.":"Live market preview. Generate a script to add briefing captions."}</div>
  </section>;
}
