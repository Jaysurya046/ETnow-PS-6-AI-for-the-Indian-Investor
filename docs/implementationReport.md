# 📋 ETNow AI — Comprehensive Implementation Report

## Interface redesign — 23 October 2026

All five workspaces now share a vanilla CSS financial terminal design: stationary benchmark quotes, numbered navigation, dense market tables, aligned IBM Plex Mono figures, responsive split panes and mobile bottom navigation. Emoji icons, glow effects, decorative gradients, marketing hero sections and simulated race animations were removed. Existing live feeds, portfolio persistence, safe markdown and SSE handling remain connected. See `docs/terminal-design.md` for design rules and verification.

## Execution update — 23 October 2026

The audit below describes the original implementation. The following work supersedes its statements about static patterns, chat responses, portfolio holdings, and simulated generation.

- **Phase 1:** Chat and video summaries render with `react-markdown`, `rehype-sanitize`, and raw HTML disabled. `getGenAI()` initializes lazily and returns `null` without credentials. Radar prompts use supplied price momentum only; fabricated event fallbacks were removed.
- **Phase 2:** `/api/chart` now returns `{ candles, analysis, interval, asOf }`. Analysis includes RSI(14), EMA(9/21/50/200), MACD(12/26/9), Classic/Camarilla/Fibonacci pivots, and algorithmic candle/crossover/breakout observations. Warm-up candles support long periods; unavailable metrics remain null. Indicator periods refer to the selected bar interval; pivots use the preceding bar, not an assumed daily session. No unmeasured backtest probability or price target is displayed.
- **Coverage:** The old `NIFTY_100` array had 99 entries and several invalid symbols. It was refreshed from the [official NSE Indices constituent CSV](https://www.niftyindices.com/IndexConstituent/ind_nifty100list.csv), retrieved 23 October 2026. A copy is saved in `docs/nifty100-2026-10-23.csv`. The snapshot contains 100 unique symbols; membership needs refresh after index reconstitutions.
- **Chart insights:** The UI requests `/api/chart-insights` on stock/range changes and refreshes every minute. The prompt receives measured indicators and Yahoo fundamentals. `nifty50Insights.ts` is retained only as a clearly marked historical offline reference. Pattern calculation covers all symbols without this dictionary.
- **Market pipelines:** `/api/sectors` queries the eight requested NSE sector indices; `/api/movers` ranks gains/losses across the complete configured universe and reports quote coverage. The video page polls these every 30 seconds. Missing data is not replaced by fabricated prices or movers.
- **Caching:** Yahoo quote batches and chart requests use a bounded 30-second in-memory TTL cache with in-flight coalescing. Failed requests are evicted. Market/chart/sector handlers export `revalidate = 30`; SDK caching provides the actual query-sensitive protection. Index routes explicitly run at request time, avoiding provider calls during builds. Cache storage is per process, not a shared distributed cache.
- **Phase 3:** Holdings are validated and stored in browser `localStorage`; new users start with an empty portfolio. `/api/quotes` supplies CMP and quote time, refreshed every 30 seconds. Unknown prices are excluded from P&L with visible coverage. The chat server re-fetches prices rather than trusting client CMP. Home NIFTY 50/SENSEX/USD-INR snapshots use `/api/market`.
- **Streaming:** `/api/chat` accepts `{ query, portfolio, stream: true }` and returns SSE `status`, `delta`, `fallback`, and `done` messages. Network chunk boundaries and UTF-8 are handled by `lib/chat-stream.ts`. Omit `stream` for a JSON response. Missing keys, quota errors, and service failures retain quantitative portfolio fallback behavior. Dated canned stock recommendations were replaced by calculations from available user holdings.
- **UI integrity:** Removed artificial chat/video delays, radar counter ticks, random flashes, stale current-news fallback cards, and unsupported home module performance counters. Video generation produces a factual script preview without claiming MP4 encoding. FII/DII and IPO panels remain explicitly marked historical samples; live ingestion and media encoding were outside the supplied three-phase execution list.

Verification commands: `npm run lint`, `npm test`, `npm run build`. The regression suite covers markdown XSS payloads, missing Gemini credentials, indicator arithmetic and insufficient history, all 100 configured symbols, mover ranking, TTL behavior, portfolio validation/P&L, UTF-8 SSE framing, and quota/provider fallbacks. See `docs/development-execution.md` for execution results and limitations.

---

## Executive Summary

**ETNow AI** (also referenced as **ET Gen-AI**) is an AI-powered financial market intelligence and portfolio platform tailored specifically for the Indian equity markets (NSE/BSE). Built with **Next.js 16.2.1** (App Router, Turbopack), **React 19.2.4**, and **TypeScript**, the platform integrates live financial market data via **Yahoo Finance (`yahoo-finance2`)** and generative intelligence via Google's latest **Gemini 2.5 Flash API (`@google/genai`)**.

This document outlines the **actual implementation** present in the codebase, detailing the active file structure, UI components, backend route handlers, static knowledge bases, and data flow mechanisms.

---

## 1. Technology Stack & Runtime Architecture

| Layer | Actual Technology / Library | Version | Purpose & Implementation Details |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | `16.2.1` | Turbopack dev server, API Route Handlers, SSR/CSR page architecture |
| **Frontend Runtime** | React / React DOM | `19.2.4` | Modern React with hooks (`useState`, `useEffect`, `useRef`) |
| **Language** | TypeScript | `^5` | Full type safety across components, interfaces, and API payloads |
| **Styling & Theme** | Vanilla CSS (`globals.css`) | Custom Design System | Dark-mode financial terminal styling, CSS custom properties (`--gold`, `--green`, `--red`, `--bg-card`), glassmorphism, keyframe animations |
| **Charting Engine** | Lightweight Charts | `5.1.0` | High-performance TradingView canvas candlestick chart with volume histogram |
| **Data Visualization** | Recharts | `3.8.1` | SVG bar charts and responsive containers used in market comparisons |
| **AI Integration** | `@google/genai` | `1.46.0` | Official Google GenAI SDK running `gemini-2.5-flash` for market analysis, signals, and video scripting |
| **Market Data** | `yahoo-finance2` | `3.14.0` | Server-side fetching of live quotes, OHLCV time-series, and basic company fundamentals |
| **Icons & Assets** | Lucide React & Custom SVG | `^1.7.0` | Navigation icons, brand logos, and status indicators |

> **Note on Styling:** Although earlier documentation mentions TailwindCSS, the application is actually styled using custom vanilla CSS tokens defined in `app/globals.css`. TailwindCSS is neither installed in `package.json` nor configured.

---

## 2. Directory Structure & Codebase Layout

```
ET-gen-ai-main/
├── app/
│   ├── api/                      # Next.js Server Route Handlers
│   │   ├── chart/                # OHLCV historical candlestick data endpoint
│   │   │   └── route.ts
│   │   ├── chart-insights/       # Gemini-based fundamental & technical stock analysis
│   │   │   └── route.ts
│   │   ├── chat/                 # Portfolio-aware financial conversational assistant
│   │   │   └── route.ts
│   │   ├── market/               # Ticker feed quotes for indices, commodities, bellwethers
│   │   │   └── route.ts
│   │   ├── radar/                # AI Opportunity Radar signal generation
│   │   │   └── route.ts
│   │   └── video/                # AI Video Engine script & market wrap generator
│   │       └── route.ts
│   ├── charts/                   # Chart Pattern Intelligence page
│   │   └── page.tsx
│   ├── chat/                     # Market ChatGPT conversational interface
│   │   └── page.tsx
│   ├── radar/                    # Opportunity Radar feed & filtering interface
│   │   └── page.tsx
│   ├── video/                    # AI Market Video Engine & dashboard
│   │   └── page.tsx
│   ├── globals.css               # Global theme tokens, layout, card, and animation styles
│   ├── layout.tsx                # App shell containing Sidebar, Header, and content area
│   ├── page.module.css           # Module-specific styling
│   └── page.tsx                  # Home / Landing overview dashboard
├── components/
│   ├── Header.tsx                # Top navigation bar with live auto-scrolling ticker & market status
│   └── Sidebar.tsx               # Fixed left navigation bar with route links
├── lib/
│   ├── gemini.ts                 # Google GenAI SDK client instantiation
│   ├── nifty100.ts               # Universe of 100 NSE stocks (ticker, name, sector, cap)
│   ├── nifty50Insights.ts        # Pre-calculated technical & quantitative insights for Nifty 50
│   ├── nifty50Patterns.ts        # Chart patterns, win rates, entry, stop loss, and targets
│   └── yahoo.ts                  # yahoo-finance2 client initialization
├── .env.local                    # Environment configuration (GEMINI_API_KEY)
├── next.config.ts                # Next.js application configuration
├── package.json                  # Dependencies and execution scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 3. Frontend Pages & User Interface Implementation

### 3.1. App Shell & Global Layout (`app/layout.tsx`)
- Wraps every view in an `.app-shell` container consisting of a fixed `<Sidebar />`, a sticky `<Header />`, and a dynamic `{children}` content wrapper.
- Implements metadata defining `ETNow AI — Intelligence for the Indian Investor`.

### 3.2. Top Navigation & Market Ticker (`components/Header.tsx`)
- **Brand Identity**: Custom SVG logo with red gradient ("ET") and branding ("ETNow AI - Intelligence for the Indian Investor").
- **Live Market Ticker**: Queries `/api/market` on initial mount and re-polls every 30 seconds.
- **Ticker Track**: Duplicates returned quotes to produce a continuous scrolling CSS animation showing prices, point changes, and percentage changes with green (`ticker-up`) or red (`ticker-down`) indicators.
- **Live Badge**: Pulsing green dot signifying active market feed connection.

### 3.3. Sidebar Navigation (`components/Sidebar.tsx`)
- Vertical navigation menu linking to all five application routes:
  1. `⚡ Home` (`/`)
  2. `📡 Radar` (`/radar`)
  3. `📈 Charts` (`/charts`)
  4. `🤖 Chat` (`/chat`)
  5. `🎬 Video` (`/video`)
- Highlights the active route using `usePathname()` from `next/navigation`.

### 3.4. Landing Overview Dashboard (`app/page.tsx`)
- **Hero Section**: Radial gold lighting effect with live market status tags (`🟢 MARKET OPEN`, `NSE · BSE · MCX`).
- **Dynamic Counter**: Includes an `AnimatedNumber` component implementing a 30-step typewriter easing animation.
- **Module Launch Cards**: Interactive glassmorphic cards for all four core features with badge indicators, feature descriptions, and key metrics:
  - Opportunity Radar (247 signals today, 78% win rate)
  - Chart Pattern Intelligence (4,800+ patterns scanned, 72% accuracy)
  - Market ChatGPT (38 data sources, 1.4s response)
  - AI Market Video Engine (12 videos today, 47s duration)
- **Market Snapshot Bar**: Quick statistics for NIFTY 50, SENSEX, FII Net (+₹2,842Cr), DII Net (-₹438Cr), India VIX (13.42), and Advance/Decline ratio (1,847/812).

### 3.5. Opportunity Radar (`app/radar/page.tsx`)
- **Signal Feed**: Displays real-time market opportunity cards characterized by:
  - Stock ticker, company full name, sector, and market cap classification (Large/Mid/Small).
  - Signal Type: `BUY`, `SELL`, `WATCH`, `INSIDER`, `ALERT`.
  - Event title (e.g., Bulk Deals, Q3 Beats, Regulatory Filings).
  - 2-3 sentence financial reasoning.
  - Confidence rating (0–100%) with color-coded gauge (Green >= 80%, Gold >= 65%, Red < 65%).
  - CMP (Current Market Price) and Target Price.
  - Three categorization tags.
- **Filtering System**:
  - Sector filter covering 29 sectors.
  - Signal Type filter (`All`, `BUY`, `SELL`, `WATCH`, `INSIDER`, `ALERT`).
  - Cap Size filter (`All`, `Large`, `Mid`, `Small`).
- **Live Data Fetch**: Calls `/api/radar` on mount. Falls back to a local dataset of 8 curated signals (`SIGNALS`) if the endpoint is loading or fails.
- **Simulated Micro-interactions**: Background interval incrementing simulated signal counter and briefly flashing random cards to indicate live activity.

### 3.6. Chart Pattern Intelligence (`app/charts/page.tsx`)
- **Interactive Candlestick Chart**: Powered by `lightweight-charts` (v5.1.0). Renders high-frequency price action alongside a synchronized volume histogram sub-pane.
- **Universe Selector**: Searchable input with an auto-suggest dropdown covering all 100 stocks from `lib/nifty100.ts`.
- **Timeframe Selector**: Supports six distinct intervals:
  - `1D` (15-minute intervals)
  - `1W` (1-hour intervals)
  - `1M` (Daily bars)
  - `3M` (Daily bars)
  - `6M` (Daily bars)
  - `1Y` (Weekly bars)
- **Chart Lifecycle & Auto-fit**: Uses dynamic `chartKey` remounting combined with `requestAnimationFrame` and `chart.timeScale().fitContent()` to ensure candles fit correctly upon stock or range change.
- **Pattern & Insights Cards**:
  - Displays detected pattern name, type (Bullish Continuation, Reversal, etc.), historical win rate, entry zone, stop loss, target, and recommendation from `lib/nifty50Patterns.ts`.
  - Displays structured technical observations and quantitative valuation/growth metrics from `lib/nifty50Insights.ts`.

### 3.7. Market ChatGPT (`app/chat/page.tsx`)
- **Portfolio-Aware Chat**: Manages user portfolio state client-side:
  - Default holdings: ONGC (240 units), HDFCNEXT50 (290 units), POWERGRID (330 units), MOSMALL250 (2100 units), TATAGOLD (3800 units).
  - Real-time P&L calculator tracking Total Value, Total Cost, Net P&L (₹), and P&L (%).
  - Modal form allowing users to add custom holdings.
- **Chat Interaction Loop**:
  - Sends user queries along with current portfolio JSON to `/api/chat`.
  - Simulates a 4-step progressive thinking UX using staggered delays (e.g., "Analyzing query...", "Fetching data...", "Applying models...", "Formatting response...").
  - Formats responses using a custom markdown parser that handles headers, emojis, bold text, bullet points, and actionable trading verdicts.
  - Displays cited sources and interactive follow-up prompt chips.

### 3.8. AI Market Video Engine (`app/video/page.tsx`)
- **Video Generator Simulator**:
  - Five pre-configured templates: Daily Market Wrap (45s), FII/DII Flow Report (30s), Sector Rotation (60s), IPO Tracker Weekly (45s), Top Gainers & Losers (30s).
  - Automated 5-stage generation pipeline with animated progress bars:
    1. Fetching live market data (1.2s)
    2. Rendering charts & visuals (1.4s)
    3. Generating AI voiceover script via `/api/video` (1.6s)
    4. Encoding video with animations (2.0s)
    5. Video ready (0.5s)
- **Live Video Stage & Player**: Renders a mock 16:9 glassmorphic player displaying animated teleprompter scripts, top 5 live movers, and AI market summary.
- **Sector Rotation & Heatmap**: Animated Recharts horizontal bar chart visualizing relative sector strength.
- **FII / DII Institutional Flow Tracker**: Chronological bar chart comparing Foreign vs Domestic Institutional Investor buying/selling.
- **IPO Intelligence Tracker**: Tabular overview of Ongoing, Recently Listed (with gain percentages), and Upcoming IPOs (with Expected GMP and Issue Sizes).

---

## 4. Backend API Routes & Server Implementation

### 4.1. `/api/chart` (`app/api/chart/route.ts`)
- **Method**: `GET`
- **Query Parameters**: `symbol` (e.g., `RELIANCE`), `range` (`1D`, `1W`, `1M`, `3M`, `6M`, `1Y`).
- **Functionality**:
  - Resolves input ticker against `symbolMap` (built from `NIFTY_100`) and aliases (e.g., `HDFC BANK` → `HDFCBANK.NS`).
  - Calculates dynamic `start` and `end` timestamps and selects appropriate candle intervals (`15m`, `1h`, `1d`, `1wk`).
  - Calls `yahooFinance.chart(nseSym, { period1, period2, interval })`.
  - Filters null bars and transforms dates to Unix timestamps (`Math.floor(date.getTime() / 1000)`) required by `lightweight-charts`.

### 4.2. `/api/market` (`app/api/market/route.ts`)
- **Method**: `GET`
- **Functionality**:
  - Fetches batch quotes using `yahooFinance.quote()` for 10 core instruments:
    - Benchmarks: `^NSEI` (NIFTY 50), `^BSESN` (SENSEX), `^NSEBANK` (BANK NIFTY), `^CNXIT` (NIFTY IT).
    - Commodities & Currency: `GC=F` (Gold COMEX), `CL=F` (Crude Oil), `INR=X` (USD/INR).
    - Key Equities: `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`.
  - Formats numerical prices using Indian numbering conventions (`en-IN`) with proper prefixing (`$` vs `₹`) and direction flags (`up: boolean`).

### 4.3. `/api/radar` (`app/api/radar/route.ts`)
- **Method**: `GET`
- **Functionality**:
  - Shuffles the `NIFTY_100` universe and picks 8 random stocks.
  - Queries Yahoo Finance for real-time market prices and percentage changes for the selected 8 tickers.
  - Passes real price action into Gemini 2.5 Flash via `@google/genai` with a system prompt instructing the model to generate 8 structured signal objects matching a strict JSON schema.
  - Enforces `responseMimeType: "application/json"`.

### 4.4. `/api/video` (`app/api/video/route.ts`)
- **Method**: `POST`
- **Payload**: `{ templateId: string }`
- **Functionality**:
  - Pulls live benchmark quotes (`^NSEI`, `^BSESN`, `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `INFY.NS`).
  - Prompts Gemini 2.5 Flash to act as the "ET Markets AI Video Engine".
  - Generates a JSON payload containing:
    - Catchy 45-second video title.
    - Markdown market summary wrap incorporating live prices and rupee symbols (`₹`).
    - Top 5 market movers (`stock`, `change`, `val`, `dir`).
    - 3-5 lines of voiceover teleprompter script.

### 4.5. `/api/chat` (`app/api/chat/route.ts`)
- **Method**: `POST`
- **Payload**: `{ query: string, portfolio: PortfolioItem[] }`
- **Functionality**:
  - Evaluates query intent (portfolio review vs stock-specific technical analysis).
  - Formulates structured prompts with explicit financial personas and required formatting.
  - Invokes `gemini-2.5-flash` via `@google/genai`.
  - **Graceful Quota Handling**: Detects HTTP 429 / `RESOURCE_EXHAUSTED` errors and responds with context-rich pre-generated fallback analyses for common queries (`portfolio`, `ongc`, `hdfcnext50`, `powergrid`, `mosmall250`, `tatagold`) or a structured offline message.

### 4.6. `/api/chart-insights` (`app/api/chart-insights/route.ts`)
- **Method**: `GET`
- **Query Parameters**: `symbol`, `range`.
- **Functionality**:
  - Fetches live stock quotes from Yahoo Finance to extract fundamental metrics: Trailing P/E, EPS, 52-Week High/Low, Market Capitalization, Average Daily Volume.
  - Supplies fundamental figures to Gemini 2.5 Flash to generate 3 technical observations, 3 quantitative valuation comparisons, overall sentiment (`Bullish`, `Bearish`, `Neutral`), and sentiment score (40–99).

---

## 5. Static Knowledge Bases & Data Files

1. **`lib/nifty100.ts`**:
   - Contains 100 NSE-listed companies with standardized symbols (`.NS`), full corporate names, sector classification, and market cap categorization (Large/Mid).
2. **`lib/nifty50Patterns.ts`**:
   - Contains technical patterns for all 50 Nifty 50 stocks (e.g., Cup & Handle, Ascending Channel, Bull Flag, Double Bottom).
   - Specifies Win Rate percentage, Entry Zone, Stop Loss level, Target level, Sentiment, and Action Recommendation.
3. **`lib/nifty50Insights.ts`**:
   - Contains curated 3-bullet technical summaries and 3-bullet quantitative fundamentals for Nifty 50 constituents.
4. **`lib/gemini.ts`**:
   - Centralizes `GoogleGenAI` client setup using `process.env.GEMINI_API_KEY`.
5. **`lib/yahoo.ts`**:
   - Instantiates a singleton `yahooFinance` client for server-side quote and chart queries.

---

## 6. Implementation Summary Table

| Feature / Module | Frontend File | Backend Route | Data Source | Status |
|---|---|---|---|---|
| **Global Header Ticker** | `components/Header.tsx` | `/api/market` | `yahoo-finance2` (10 symbols) | Live (30s polling) |
| **Landing Dashboard** | `app/page.tsx` | N/A | Static + Navigation | Active |
| **Opportunity Radar** | `app/radar/page.tsx` | `/api/radar` | `yahoo-finance2` + Gemini 2.5 Flash | Live (with static fallback) |
| **Chart Intelligence** | `app/charts/page.tsx` | `/api/chart` | `yahoo-finance2` + `lib/nifty50*` | Live OHLCV + Static Patterns |
| **Market ChatGPT** | `app/chat/page.tsx` | `/api/chat` | Gemini 2.5 Flash + Fallback Cache | Live AI + Quota Fallback |
| **Market Video Engine** | `app/video/page.tsx` | `/api/video` | `yahoo-finance2` + Gemini 2.5 Flash | Live Script Generation + UI Simulation |
| **Chart Insights (API)** | Not linked in UI | `/api/chart-insights` | `yahoo-finance2` + Gemini 2.5 Flash | Backend Ready |

## Live institutional and IPO feeds — 23 October 2026

Implemented `/api/fii-dii` and `/api/ipo`, typed NSE normalization, cookie/session handling, bounded stale-aware caches, verified offline captures, and Upstox institutional history backfill. Replaced the Market briefing archive samples with active institutional bars/session details and ongoing/upcoming/listed IPO tables. Listing gains use historical listing-day prices only; unavailable fields remain blank. See `docs/feed-pipelines.md` for contracts, units, provenance, TTLs, and deployment limits.

## Interactive chart overlays — 23 October 2026

Added full EMA/Bollinger/RSI time-series calculations and warm-up-aware `/api/chart` payloads. The chart now has persistent EMA 20/50/200 and Bollinger toggles plus a native synchronized RSI pane with fixed 0–100 scale and 70/50/30 thresholds. Extracted the canvas lifecycle into `components/CandlestickChart.tsx`, including responsive resizing and complete cleanup. See `docs/chart-indicators.md` for period semantics and the library's integer-width constraint.

## Remotion video production — 23 October 2026

Added a shared 45-second 1080p Remotion composition, interactive Player with scene navigation, and genuine client-side MP4/WebM export using the official WebCodecs renderer. Generated scripts and source data now travel as one snapshot; AI failures return explicitly labeled factual scripts. Export supports real progress, cancellation, automatic download and encoded-file review. See `docs/video-production.md` for frame boundaries, source integrity, browser requirements and Remotion licensing.

## Documentation and production deployment — 23 October 2026

Replaced the legacy README with the implemented five-workspace architecture, actual dependencies, terminal design, typed feed behavior, silent video exports, environment configuration and verification links. Added standalone output, a three-stage Alpine Dockerfile, non-root runtime, excluded secret/build contexts, Compose orchestration and an uncached `/api/health` route. `npm start` now prepares assets and launches the traced standalone server. Deployment instructions cover Vercel, ECS and Cloud Run, runtime secret injection, public build variables, health probes and per-process cache limits. The requested Node 20 image default is configurable; the guide recommends selecting a supported runtime because Node 20 is end-of-life.

Verification: all 32 tests passed (31 existing plus health regression); ESLint clean; production standalone build and strict TypeScript checks passed. The first sandboxed build could not copy dependencies due to EPERM; rerunning with the required filesystem access succeeded. Actual `npm start` smoke checks returned 200 for `/api/health`, the homepage, a generated JavaScript asset and a public SVG, plus the expected 400 for an invalid video API request. Health returned a current UTC timestamp, numeric process uptime and `Cache-Control: no-store`. README documentation links and Compose YAML parsing passed. The temporary test server was stopped. Docker is not installed in this environment, so Linux image build/runtime and cloud deployment remain unverified; no cloud resources were created.

## Query-aware research and template transcripts — 24 October 2026

All four AI routes now use shared model resolution: `GEMINI_MODEL` or `gemini-2.5-flash-lite`, with deduplicated fallback candidates (Flash-Lite, then `gemini-3.8-flash`) on HTTP 404/503 only. Quota/authentication failures retain factual fallbacks. Chat retries include failures at the start of stream iteration and stop after the first visible token or cancellation.

Research fallbacks distinguish referenced NSE stocks, portfolio calculations, financial definitions and general questions. Requested stock quotes go through the shared cache and are also supplied to AI; offline fields remain unavailable. Video scripts, titles and wraps now follow the selected template: benchmark session, dated institutional cash flows and combined net, sector leaders/laggards/spread, published IPO subscriptions/listing gains/open dates, or gainers/losers and actual quote coverage. IPO calendars never imply verified SEBI filings. Compose forwards the model override.

Verification: 39 regression tests passed; ESLint and standalone production build/TypeScript passed. Live dev-server HTTP/SSE checks returned real AI answers for RSI, RELIANCE and portfolio risk, plus five distinct AI titles, wraps and transcripts. These exercise the same requests as the UI. The in-app browser failed to attach twice, so direct visual UI verification remains unconfirmed. The temporary development server was stopped.
