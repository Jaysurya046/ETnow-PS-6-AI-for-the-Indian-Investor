# ETNow AI

**Industrial Financial Market Intelligence & Trading Terminal for the Indian Investor (NSE / BSE)**

ETNow AI brings market quotes, technical analysis, portfolio research, institutional cash flows, IPO intelligence and programmatic video production into five connected workspaces. It uses timestamped provider data, measured indicators and explicitly labeled fallbacks. Quotes may be delayed. This is a research terminal, with no broker execution or account synchronization.

## Workspaces

| Workspace | Route | Capabilities |
| --- | --- | --- |
| 01 / Market Overview | `/` | Stationary benchmarks, searchable session movers with chart deep-links, sector performance bars |
| 02 / Signal Monitor | `/radar` | Grounded price/technical signals, confidence indicators, sector and capitalization filters |
| 03 / Chart Analysis | `/charts` | Verified 100-symbol NSE universe, candlesticks and volume, interactive EMA 20/50/200, Bollinger Bands (20,2), synchronized 100px RSI(14) pane, dynamic indicators and pivot levels |
| 04 / Research Desk | `/chat` | Holdings persisted in browser storage (`etnow.portfolio.v1`), live CMP and P&L, sanitized Markdown, SSE streaming Gemini research and quota fallback |
| 05 / Market Briefing & Studio | `/video` | Live FII/DII cash flows and IPO tables, sector rotation, AI/factual scripts, interactive Remotion Player and genuine 1080p MP4/WebM downloads |

The terminal uses IBM Plex Sans and IBM Plex Mono, tabular numeric figures, crisp borders, compact tables and segmented controls. Vanilla CSS tokens and container queries adapt the workspace from 375px phones to 4K monitors. Signed values, keyboard focus, labeled controls and reduced-motion support accompany the visual design.

## Technology

| Layer | Implementation |
| --- | --- |
| Framework | Next.js **16.2.1**, App Router, Turbopack, standalone output |
| Runtime | React / React DOM **19.2.4**, TypeScript **^5**, Node.js |
| Styling | Pure vanilla CSS in `app/globals.css`; terminal tokens and IBM Plex typography; zero TailwindCSS |
| Financial charting | Lightweight Charts **5.1.0**, EMA/Bollinger overlays and synchronized RSI pane |
| Indicators | `technicalindicators` **3.1.0**, chronological time-series and measured summaries |
| Data visualization | Recharts **3.8.1** for institutional flows and sector comparisons |
| AI | Google Gemini **2.5 Flash** via `@google/genai` **1.46.0**, SSE chat and quota-resilient fallbacks |
| Market data | `yahoo-finance2` **3.14.0**, shared 30-second in-memory quote caching; official NSE JSON feeds |
| Video | `remotion`, `@remotion/player`, `@remotion/web-renderer` **4.0.538**; 45 seconds, 1920×1080, 30fps |
| Verification | Node test runner, TypeScript compilation and ESLint |

Use `npm ci` to reproduce `package-lock.json`; some dependency declarations allow compatible updates.

## Quickstart

Use a current supported Node.js LTS release and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. For AI responses, create an untracked `.env.local`:

```dotenv
GEMINI_API_KEY=your_google_genai_key
```

The key is optional for builds and offline regression tests. Without it, AI routes use fallback paths; live market feeds still require network access. Keep the key server-side and supply it separately at runtime in production.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Optional server credential for Gemini |
| `NEXT_PUBLIC_REMOTION_LICENSE_KEY` | Optional **public build-time** browser rendering key, subject to Remotion licensing |
| `PORT` | Production port; defaults to 3000, supplied by Cloud Run when deployed there |
| `HOSTNAME` | Production bind address; containers use `0.0.0.0` |

```sh
npm test          # Regression suite; no live credentials required
npm run lint      # ESLint (run separately from the build)
npm run build     # Production compilation and standalone file tracing
npm start         # Copy assets, then launch .next/standalone/server.js
```

## Architecture and data integrity

Client workspaces consume Next.js route handlers. Server adapters normalize Yahoo/NSE responses, coalesce concurrent requests and cache upstream results. Gemini receives measured market or portfolio context. Missing figures stay unavailable; prompts must never fabricate company events, filings or insider trades.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/market` | Benchmarks, currency and commodity quotes |
| `GET /api/quotes` | Validated symbol quotes for portfolio holdings |
| `GET /api/movers` | Gainers/losers across NIFTY 100; reports available quote coverage |
| `GET /api/sectors` | Eight official NSE sectoral indices via Yahoo Finance |
| `GET /api/chart?symbol=RELIANCE&range=1M` | OHLCV with indicator warm-up history |
| `GET /api/chart-insights` | Measured technical and AI research context |
| `GET /api/radar` | Grounded market signals |
| `GET /api/fii-dii` | Daily institutional flows, history, acquisition timestamp and stale state |
| `GET /api/ipo` | Ongoing, upcoming and listed issues; published/verified fields only |
| `POST /api/chat` | Portfolio-aware SSE research |
| `POST /api/video` | Script and coherent video input snapshot |
| `GET /api/health` | Uncached application health, UTC timestamp and process uptime in seconds |

FII/DII figures are daily cash-market closes in crores, not intraday flows. Their cache uses two-hour weekday market/publication windows and twelve hours outside those windows. IPO snapshots cache for one hour. Upstream failures preserve original timestamps and explicitly mark cached source captures stale. IPO issue-size units are preserved; unpublished GMP or subscription detail is absent.

Caches and cookie sessions are process-local. Replicas do not share refreshed data; a durable shared cache is a separate deployment concern. Providers can be delayed, rate-limited or blocked by region/network. Browser-local portfolios are neither encrypted account storage nor server persistence.

The video Player and export share four scenes: benchmarks (0–8s), movers (8–20s), sectors/flows (20–32s), script/outro (32–45s). Exports contain exactly 1,350 frames. Browser WebCodecs chooses H.264/MP4 or VP8/WebM; HTTPS or localhost and a supported encoder are required. Exports are **silent with script captions**, support progress/cancellation, and run in browser memory. Preview speed does not imply a fixed encoding time. Review Remotion licensing and telemetry before deployment.

## Documentation

- [Terminal design system and 375px–4K verification](docs/terminal-design.md)
- [NSE institutional and IPO feed contracts, sources and fallbacks](docs/feed-pipelines.md)
- [Chart indicators and pane behavior](docs/chart-indicators.md)
- [Remotion composition, encoding, browser support and licensing](docs/video-production.md)
- [Production deployment and operations](docs/deployment.md)
- [Official NSE 100-constituent snapshot — 23 October 2026](docs/nifty100-2026-10-23.csv)
- [Development execution and API behavior](docs/development-execution.md)

Core code lives in `app/` (pages/routes), `components/` (terminal, chart and video UI), and `lib/` (typed adapters, indicators, caches, portfolio and export logic). Verified fallback captures live in `lib/data/`. Historical audits retain earlier descriptions; dated completion notes and linked feature documents describe the implemented milestones.

## Deployment

For Docker with Compose:

```sh
docker compose up --build -d
```

Compose reads `GEMINI_API_KEY` from the calling environment or an untracked `.env`; it does **not** automatically use `.env.local`. Omit the key to exercise factual fallbacks. The multi-stage Alpine image uses `npm ci`, standalone tracing, a non-root `nextjs:nodejs` runner, static assets and an HTTP health check. Build context excludes credentials, tests, dependencies and generated videos. A build-scoped dummy AI key never becomes the runtime credential.

For a standalone image:

```sh
docker build -t etnow-ai .
docker run --rm -p 3000:3000 --env GEMINI_API_KEY etnow-ai
```

Vercel uses the Next.js integration (`npx vercel deploy --prod` after account/project setup). The same container can run on ECS or Cloud Run with provider-specific registry, identity and service configuration. See the [deployment guide](docs/deployment.md) for commands, health probes, secrets, Node image selection and operational limits. These files do not provision cloud resources.

## Verification

The 31 feature regression tests cover indicator math/alignment, portfolio validation, SSE parsing, caching/expiry/offline behavior, feed normalization/categorization, coherent video props, scene boundaries, script fallbacks and export capability/progress/cancellation. A health-route regression adds a 32nd test for the production endpoint. Run `npm test`, `npm run lint` and `npm run build` before release.

Recorded browser checks cover 375px–4K layouts. A complete browser export was independently decoded as H.264, 1920×1080, 30fps, 1,350 frames and 45 seconds; see [video verification](docs/video-production.md). These are completed checks, not guarantees for every browser or deployment environment.

Research outputs are informational; indicator signals and model confidence are not measured investment returns or trading accuracy. Data-provider terms and Remotion's license apply to deployment and redistribution.
