import { MarketVideoComposition } from "@/components/video/MarketComposition";
import { VIDEO, normalizeVideoProps, videoFilename, type MarketVideoProps } from "@/lib/video";

export async function exportMarketVideo(input: MarketVideoProps, signal: AbortSignal, onProgress: (progress:number)=>void) {
  const props=normalizeVideoProps(input);
  const {canRenderMediaOnWeb,renderMediaOnWeb}=await import("@remotion/web-renderer");
  signal.throwIfAborted();
  await document.fonts.ready;
  await document.fonts.load('400 30px "IBM Plex Mono"');
  const candidates=[{container:"mp4",videoCodec:"h264"},{container:"webm",videoCodec:"vp8"}] as const;
  let selected:typeof candidates[number] | null=null;
  for(const candidate of candidates) {
    const support=await canRenderMediaOnWeb({...candidate,width:VIDEO.width,height:VIDEO.height,muted:true,outputTarget:"arraybuffer"});
    signal.throwIfAborted();
    if(support.canRender) { selected=candidate;break; }
  }
  if(!selected) throw new Error("Video export needs WebCodecs encoding support. Try a current Chrome or Edge browser.");
  const rendered=await renderMediaOnWeb({
    composition:{id:"ETNowMarketWrap",component:MarketVideoComposition,...VIDEO,defaultProps:props},
    inputProps:props,...selected,signal,muted:true,outputTarget:"arraybuffer",videoBitrate:6_000_000,
    pageResponsiveness:"high",licenseKey:process.env.NEXT_PUBLIC_REMOTION_LICENSE_KEY || null,
    onProgress:({progress})=>onProgress(Math.min(99,Math.floor(progress*100))),
  });
  signal.throwIfAborted();
  const blob=await rendered.getBlob();
  if(blob.size===0) throw new Error("The encoder returned an empty file. Please try again.");
  onProgress(100);
  return {blob,filename:videoFilename(props,selected.container),format:selected.container};
}
