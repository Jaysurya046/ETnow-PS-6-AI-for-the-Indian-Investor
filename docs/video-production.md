# Programmatic market video production

The Market briefing workspace now previews and exports one real Remotion composition: 1920×1080, 30fps, 1,350 frames (45 seconds). It uses pure React/CSS drawing primitives supported by the official browser renderer. No screen recording or renamed image/text download is involved.

## Scenes

| Frames (end exclusive) | Seconds | Content |
| --- | --- | --- |
| 0–240 | 0–8 | Benchmark headline, session date/status, animated point changes |
| 240–600 | 8–20 | Up to five real gainers and five losers |
| 600–960 | 20–32 | Ranked sector changes and verified FII/DII cash flows |
| 960–1350 | 32–45 | Three to five script captions, attribution, disclaimer |

`lib/video.ts` defines frame math, contracts, validation, formatting and deterministic factual script fallbacks. `components/video/MarketComposition.tsx` is shared by Player and export. All animation derives from Remotion frames, not wall-clock timers. Scene buttons seek to settled animation frames; the Player also supports playback, scrubbing, looping and fullscreen.

## Snapshot and source integrity

Live preview uses the existing market, movers, sectors and institutional routes. Generate script requests `/api/video`, which gathers one bounded snapshot and supplies it to Gemini 2.5 Flash. The response includes both script and video props. Subsequent quote polling does not mutate that generated video. Export makes its own normalized copy and pauses preview while encoding.

Session dates come from provider quote timestamps, not the date on the user's computer. Closed/in-session labels use provider market state when available. Individual benchmark timestamps are printed on the video. Institutional flows retain their own trading date and stale flag, so yesterday's or cached flows are not presented as today's closing figures. Missing values remain unavailable. Partial arrays never get synthetic stock or sector rows.

If AI is missing, exhausted or fails validation, the route returns an explicitly labeled measured-data script using the supplied values. The preview and transcript disclose that fallback. Files are silent, with script captions; browser speech synthesis is deliberately not represented as recorded audio.

## Export

`lib/video-export.ts` lazy-loads `@remotion/web-renderer`, checks WebCodecs capability for 1080p H.264/MP4, then tries VP8/WebM if unsupported. The renderer consumes the exact composition and frozen props, encodes all 1,350 frames, and supplies genuine encoder progress. The UI supports cancellation, automatic download, repeat download and playback of the encoded file. Duration and dimensions in the file review come from the browser's decoded metadata, not composition constants.

Names follow `etnow-market-wrap-YYYY-MM-DD.mp4` (or `.webm`); the date is snapshot capture date in IST. Blob URLs are revoked when replaced or unmounted, and active renders are aborted on unmount. The renderer buffers the compressed file in browser memory; no market snapshot or rendered file is uploaded to an application render server. Keep the tab open during export. Export time depends on hardware; browser preview and full-resolution encoding have different performance costs.

Browser export requires WebCodecs in a secure context (HTTPS or localhost). Current Chromium browsers are recommended. Unsupported encoders produce an explicit message and never a placeholder download. No backend render farm, FFmpeg installation or cloud account is needed.

## Dependencies and licensing

Official packages are pinned together at 4.0.538: `remotion`, `@remotion/player`, `@remotion/web-renderer`. React 19 installed without a peer-dependency override.

Remotion's license requirements still apply. Player's `acknowledgeRemotionLicense` suppresses the library's reminder after documenting it here; it does not purchase or assert ownership of a Company License. Review https://www.remotion.dev/license before commercial deployment. If needed, configure `NEXT_PUBLIC_REMOTION_LICENSE_KEY` for browser rendering. Remotion documents that client renders send vendor telemetry even without a key: https://www.remotion.dev/docs/client-side-rendering . This is separate from the application's market data requests.

`npm audit` reports existing advisories in the pinned Next.js/framework tooling. The audited Remotion packages are not named by those findings. No forced framework upgrade was applied as part of video production.

## Verification

Automated tests cover exact duration, every scene boundary, partial and malformed props, Indian number parsing, source session dates, stale cash flows, AI and factual script paths, encoder capability fallback, real progress forwarding, and cancellation. Production UI verification should also encode the complete file and inspect its decoded duration, resolution and scene transitions.

Production verification completed: a full browser export produced `etnow-market-wrap-2026-10-23.mp4` (5,352,646 bytes). Independent `ffprobe -count_frames` confirmed H.264, 1920×1080, 30/1 fps, exactly 1,350 decoded frames, and 45.000000 seconds. Extracted frames at 10, 25 and 40 seconds were reviewed for scene content, financial labels and layout. Gemini was unavailable during this live test, and the file correctly identified its factual-script fallback.

Responsive checks measured 16:9 throughout: 343.33×193.13 at a 375px viewport, 1200×675 at 1440px, and 2734.67×1538.25 at 3840px. Document widths stayed within every viewport. Temporary viewport overrides and the local test server were reset after verification. Keep the browser tab visible during export to avoid background-tab throttling.

Final automated validation: 31 tests passed, ESLint clean, production build successful.
