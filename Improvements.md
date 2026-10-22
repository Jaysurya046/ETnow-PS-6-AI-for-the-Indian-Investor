# 🛠️ ETNow AI — Issues, Hardcoded Data Audit & Architectural Improvements

## Execution status — 23 October 2026

The original audit and broader architecture proposals below are retained for context. The user's three-phase roadmap has been implemented: safe markdown/lazy Gemini/grounded radar; measured chart indicators, live insights, sectors and movers, real counters and caching; persistent holdings, live landing snapshot, and SSE chat. See `implementationReport.md` and `docs/development-execution.md` for the current interfaces and verification.

Remaining work from this broader audit includes live FII/DII ingestion, live IPO ingestion, distributed caching/rate limiting, account/broker persistence, real MP4 rendering. Home module cards now describe implemented capabilities rather than unmeasured usage or accuracy counters. FII/DII and IPO sample panels are labeled historical. The NSE universe is now a verified 100-symbol snapshot and still requires periodic membership maintenance.

---

This document provides a comprehensive engineering audit of the current codebase implementation. It details:
1. **Critical Code, Security & Compliance Issues** in the active implementation.
2. **Exhaustive Audit of Hardcoded Data** across all files and components.
3. **Complete Engineering Blueprint** on how to replace every static data structure with live, genuine financial market pipelines.
4. **Proposed Enterprise Architecture** and prioritized implementation roadmap.

---

## 1. Critical Issues in the Actual Implementation

### 1.1. Critical Security Vulnerability: Unsanitized HTML in Chat UI
- **Location**: `app/chat/page.tsx` (Lines 237, 246)
- **Issue**: The `renderContent()` function uses `dangerouslySetInnerHTML` with naive regex replacement:
  ```tsx
  dangerouslySetInnerHTML={{
    __html: line.replace(/\*\*(.+?)\*\*/g, '<strong ...>$1</strong>')
  }}
  ```
- **Risk**: Stored or reflected Cross-Site Scripting (XSS). If Gemini outputs raw HTML, scripts, or unescaped markdown containing `<img src=x onerror=...>`, or if user queries containing malicious payloads are reflected back, arbitrary scripts execute in the user's browser session.
- **Fix**: Replace manual string injection with `react-markdown` configured with `rehype-sanitize`.

---

### 1.2. Runtime Crash on Missing Environment Variables
- **Location**: `lib/gemini.ts` (Lines 5–7)
- **Issue**: Top-level exception throwing:
  ```ts
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }
  ```
- **Impact**: Any file or route importing `lib/gemini.ts` crashes during static analysis, CI pipelines, unit testing, or Next.js build time if `GEMINI_API_KEY` is temporarily missing from the environment.
- **Fix**: Lazy-initialize the Gemini client inside request handlers or create a helper function that returns `GoogleGenAI | null` and handles missing keys gracefully.

---

### 1.3. Regulatory & Ethical Compliance: Prompted AI Hallucination in Radar
- **Location**: `app/api/radar/route.ts` (Line 20)
- **Issue**: The prompt sent to Gemini explicitly instructs the model to fabricate regulatory events:
  ```text
  "Invent plausible real-time 'news' or 'events' (like bulk deals, SEC filings, insider buys) that justify the current price action for these exact 8 stocks."
  ```
- **Impact**: Fabricating insider trading, promoter buybacks, and SEBI regulatory filings presents severe compliance and legal risks under SEBI (Prohibition of Fraudulent and Unfair Trade Practices) regulations. Users acting on hallucinated insider deals could suffer real financial losses.
- **Fix**: Remove hallucination instructions. Connect the route to real NSE corporate announcement feeds, BSE filings APIs, or enable Gemini Grounding with Google Search.

---

### 1.4. Orphaned API Route: `/api/chart-insights`
- **Location**: `app/api/chart-insights/route.ts` vs `app/charts/page.tsx`
- **Issue**: An advanced API route (`/api/chart-insights`) was created to calculate P/E, EPS, 52W High/Low, and query Gemini for dynamic technical and quantitative insights. However, **`app/charts/page.tsx` never calls this endpoint**.
- **Impact**: The UI instead reads from a static dictionary in `lib/nifty50Insights.ts`. The backend endpoint remains completely orphaned and unused.
- **Fix**: Wire `app/charts/page.tsx` to fetch `/api/chart-insights?symbol=${selected.label}&range=${range}`, displaying live AI analysis with the static dictionary serving solely as an offline fallback.

---

### 1.5. Incomplete Universe Coverage (NIFTY 100 vs NIFTY 50)
- **Location**: `app/charts/page.tsx` (Lines 211, 219)
- **Issue**: The stock selection dropdown offers all 100 stocks from `lib/nifty100.ts`. However, `lib/nifty50Patterns.ts` and `lib/nifty50Insights.ts` only contain data for 50 companies (NIFTY 50).
- **Impact**: Selecting any stock ranked 51–100 (e.g., `ZOMATO`, `DMART`, `PAYTM`, `JIOFIN`) results in `undefined` pattern and insight lookups, causing cards to render empty or broken without explanation.
- **Fix**: Implement dynamic algorithmic pattern detection that computes patterns on the fly for any symbol using its OHLCV data.

---

### 1.6. Brittle Regex Parser in Chat API
- **Location**: `app/api/chat/route.ts` (Line 308)
- **Issue**: Stock extraction regex strictly requires a trailing period:
  ```ts
  const symbol = query.match(/for\s+([A-Z\s0-9]+)\./)?.[1] || "the stock";
  ```
- **Impact**: If a user submits "Provide technical analysis for ONGC" without a period at the end, the regex fails to match and defaults to "the stock", generating generic analysis without ticker context.
- **Fix**: Use robust regex `/(?:for|of|on)\s+([A-Za-z0-9&]+)/i` or use Gemini function calling / schema extraction to parse entity parameters reliably.

---

### 1.7. Deceptive UI Elements & Artificial Delays
- **Location**:
  - `app/radar/page.tsx` (Lines 139–153): `setInterval` periodically generates fake counter increases (`c + Math.floor(Math.random() * 3)`) and triggers arbitrary card flash animations.
  - `app/chat/page.tsx` (Lines 172–196): Staggered `setTimeout` calls total **2.3 seconds of artificial delay** before displaying the API response.
  - `app/video/page.tsx` (Lines 118–133): Hardcoded 5-step progress bar forces **6.7 seconds of artificial delay**.
- **Impact**: Degrades actual user experience by artificially delaying responses. Fabricating signal counts undermines user trust.
- **Fix**: Remove artificial delays. Stream real AI thinking steps via Server-Sent Events (SSE).

---

### 1.8. "Video Engine" is Not a True Video Generator
- **Location**: `app/video/page.tsx`
- **Issue**: The page does not generate downloadable or streamable video files (MP4, WebM, or HLS). It is an interactive React dashboard styled to resemble a video player, displaying static charts and hardcoded March 2026 IPO data.
- **Fix**: Integrate a real programmatic video renderer such as **Remotion** with Web Audio / TTS synthesis (ElevenLabs / Web Speech API) to produce genuine MP4 downloads.

---

### 1.9. Dead Code & Unused State
- **Location**:
  - `app/chat/page.tsx`: The `AI_RESPONSES` object (lines 28–107) and `getAIResponse` helper (lines 142–147) are never invoked in `sendMessage()`.
  - `app/charts/page.tsx`: Unused state variable `insightsLoading` declared at line 179.
- **Fix**: Remove dead code and unused state to keep bundle size minimal.

---

### 1.10. Yahoo Finance Rate Limiting & Lack of Caching
- **Location**: `app/api/chart/route.ts`, `app/api/market/route.ts`, `app/api/radar/route.ts`
- **Issue**: Every incoming request to `/api/chart` or `/api/market` makes direct upstream HTTP calls to Yahoo Finance without server-side caching or rate-limiting.
- **Impact**: The top navigation ticker re-polls `/api/market` every 30 seconds for all active users. Multiple concurrent visitors will quickly trigger Yahoo Finance IP rate-limiting (HTTP 429), breaking data feeds across the site.
- **Fix**: Implement in-memory caching or Redis caching with Next.js Route Segment Config (`export const revalidate = 30`).

---

### 1.11. Documentation Discrepancies in `README.md`
- **Issue**:
  - Claims **TailwindCSS** is part of the stack (line 5), but the application actually uses Vanilla CSS with no Tailwind dependencies.
  - Claims **38 data sources** and live FII/DII tracking, whereas FII/DII and IPO figures are static hardcoded arrays.
  - Claims automated video encoding when it is purely an animated CSS dashboard.
- **Fix**: Align `README.md` with the actual codebase capabilities.

---

## 2. Hardcoded Data Inventory & Complete Blueprint to Make It Genuine

The platform currently relies heavily on frozen, hardcoded data structures across almost every page. Below is an exhaustive inventory of all static data in the codebase, followed by the exact technical blueprint to replace each with live, genuine financial data pipelines.

### 2.1. Complete Inventory of Hardcoded Data

| File Location | Static Variable Name | Content Description | Lines of Static Code |
|---|---|---|---|
| `lib/nifty50Patterns.ts` | `NIFTY50_PATTERNS` | Hardcoded technical patterns, win rates (70–85%), entry zones, stop losses, and target prices for 50 stocks | 526 lines |
| `lib/nifty50Insights.ts` | `NIFTY50_INSIGHTS` | Pre-written 3-bullet technical summaries and 3-bullet quantitative valuation metrics for 50 stocks | 208 lines |
| `app/video/page.tsx` | `SECTOR_DATA` | 8 static sectors (IT, Telecom, Energy, FMCG, Auto, etc.) with fixed % change figures | Lines 21–30 |
| `app/video/page.tsx` | `FII_DII_DATA` | Fixed historical flow figures frozen between March 20 and March 27, 2026 | Lines 32–39 |
| `app/video/page.tsx` | `TOP_MOVERS` | 5 static stocks (ONGC, WIPRO, BHARTI, SHRIRAM, TATA M) with frozen price and % changes | Lines 41–47 |
| `app/video/page.tsx` | `IPO_DATA` | 15 static IPOs (Ongoing, Recently Listed, Upcoming) with frozen dates, issue sizes, and GMPs | Lines 49–70 |
| `app/radar/page.tsx` | `SIGNALS` | 8 static fallback signals (RELIANCE, TATAPOWER, ZOMATO, ADANIENT, etc.) with frozen prices and confidence | Lines 22–79 |
| `app/chat/page.tsx` | `PORTFOLIO` | Static default holdings (ONGC, HDFCNEXT50, POWERGRID, MOSMALL250, TATAGOLD) with frozen cost prices | Lines 20–26 |
| `app/chat/page.tsx` | `AI_RESPONSES` | Hardcoded multi-paragraph analyses for Reliance, Nifty, and Default (dead code) | Lines 28–107 |
| `app/api/chat/route.ts` | `FALLBACK_RESPONSES` | 6 canned multi-paragraph financial analyses with static prices and "Last updated: 29-Mar-2026" stamps | Lines 7–276 (270 lines) |
| `app/page.tsx` | `MARKET_STATS` | Static index levels: Nifty (22,513), Sensex (74,119), FII Net (+₹2,842Cr), DII Net (-₹438Cr), VIX (13.42) | Lines 72–79 |

---

### 2.2. Engineering Blueprint: Replacing Hardcoded Data with Live Pipelines

#### 🔵 Blueprint 1: Dynamic Technical Patterns & Insights (Replacing `nifty50Patterns.ts` & `nifty50Insights.ts`)
- **Current State**: Static dictionary of 50 stocks. Stocks 51–100 show blank cards. Patterns are static strings rather than calculated signals.
- **Genuine Implementation**:
  1. **Algorithmic Technical Indicators**: Install the `technicalindicators` npm package or compute indicators directly from the OHLCV candles retrieved from `/api/chart`:
     ```ts
     import { RSI, EMA, MACD, BollingerBands } from "technicalindicators";

     // Calculate live RSI-14 from OHLCV close prices
     const closes = candleBars.map(c => c.close);
     const rsiValues = RSI.calculate({ values: closes, period: 14 });
     const currentRSI = rsiValues[rsiValues.length - 1];

     // Calculate 20, 50, 200 EMAs
     const ema50 = EMA.calculate({ values: closes, period: 50 }).pop();
     const ema200 = EMA.calculate({ values: closes, period: 200 }).pop();
     ```
  2. **Automated Candlestick & Pattern Detection**:
     - Detect **Double Bottoms**, **Breakouts**, **Bull Flags**, and **Moving Average Crossovers** programmatically by evaluating consecutive candle highs, lows, and volume spikes.
     - Calculate Pivot Points dynamically:
       - $Pivot = (High + Low + Close) / 3$
       - $R1 = 2 \times Pivot - Low$
       - $S1 = 2 \times Pivot - High$
  3. **Real-Time Gemini Synthesis via `/api/chart-insights`**:
     - Pass the computed technical indicators and live fundamental metrics (P/E, EPS, 52W High/Low from Yahoo Finance) into Gemini 2.5 Flash.
     - This allows **every stock in NIFTY 100** to have 100% dynamic, real-time technical patterns and quantitative insights, completely eliminating `nifty50Patterns.ts` and `nifty50Insights.ts`.

---

#### 🔵 Blueprint 2: Genuine Sector Performance & Heatmap (Replacing `SECTOR_DATA`)
- **Current State**: Hardcoded static array of 8 sectors with frozen percentage changes.
- **Genuine Implementation**:
  1. Map sectors to official NSE Sectoral Indices available on Yahoo Finance:
     ```ts
     const SECTOR_INDICES = [
       { name: "IT", symbol: "^CNXIT" },
       { name: "Banking", symbol: "^NSEBANK" },
       { name: "Auto", symbol: "^CNXAUTO" },
       { name: "FMCG", symbol: "^CNXFMCG" },
       { name: "Metals", symbol: "^CNXMETAL" },
       { name: "Pharma", symbol: "^CNXPHARMA" },
       { name: "Realty", symbol: "^CNXREALTY" },
       { name: "Energy", symbol: "^CNXENERGY" },
     ];
     ```
  2. Create an API route `/api/sectors` that calls `yahooFinance.quote(SECTOR_INDICES.map(s => s.symbol))`.
  3. Dynamically compute the daily percentage change and return live data to `app/video/page.tsx`.

---

#### 🔵 Blueprint 3: Genuine FII / DII Institutional Flows (Replacing `FII_DII_DATA`)
- **Current State**: Hardcoded static array frozen to March 20–27, 2026.
- **Genuine Implementation**:
  1. **Data Ingestion**: NSE publishes official daily FII and DII net trading figures post-market close (around 6:00 PM IST) at:
     - Endpoint: `https://www.nseindia.com/api/fiidiiTradeReact`
     - Alternative provider: StockEdge / Moneycontrol open daily summary feeds.
  2. **Persistence & Caching**:
     - Create a simple SQLite table or Redis key `fii_dii_history` storing `{ date, fii_net, dii_net }`.
     - A Next.js API route `/api/fii-dii` reads the latest 10 trading sessions from the database.
     - During market hours, the latest available closing figures are served instantly with zero lag.

---

#### 🔵 Blueprint 4: Genuine Top Movers (Gainers & Losers) (Replacing `TOP_MOVERS`)
- **Current State**: Fixed list of 5 stocks (`ONGC`, `WIPRO`, `BHARTI`, `SHRIRAM`, `TATA M`).
- **Genuine Implementation**:
  1. Utilize the existing `NIFTY_100` stock universe in `lib/nifty100.ts`.
  2. Batch-fetch quotes in `/api/market` or `/api/video`:
     ```ts
     const quotes = await yahooFinance.quote(NIFTY_100.slice(0, 50).map(s => s.sym));
     // Sort by regularMarketChangePercent
     const gainers = quotes
       .sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
       .slice(0, 5)
       .map(q => ({
         stock: q.symbol.replace(".NS", ""),
         change: `+${q.regularMarketChangePercent?.toFixed(2)}%`,
         val: `₹${q.regularMarketPrice?.toLocaleString("en-IN")}`,
         dir: "up"
       }));
     ```
  3. This ensures the top movers in the video engine and dashboard reflect the actual highest gainers and losers of the current trading session.

---

#### 🔵 Blueprint 5: Genuine IPO Intelligence (Replacing `IPO_DATA`)
- **Current State**: 15 hardcoded IPOs with static Grey Market Premiums (GMP) and frozen March/April 2026 dates.
- **Genuine Implementation**:
  1. Ingest live IPO information from the official NSE India IPO API or public IPO tracking feeds (e.g., Chittorgarh / InvestorGain):
     - `https://www.nseindia.com/api/ipo-current-issue`
  2. Route `/api/ipo` returns structured data categorized into:
     - `ongoing`: Current active bids with real-time subscription figures.
     - `listed`: Recent listings with actual listing day price performance calculated from Yahoo Finance.
     - `upcoming`: Filings with SEBI with confirmed issue dates and price bands.
  3. GMP estimation can be enriched using Gemini Search Grounding to extract the latest reported Grey Market Premium from verified financial news outlets.

---

#### 🔵 Blueprint 6: Genuine Portfolio Management & Dynamic Chat Context (Replacing `PORTFOLIO` & `FALLBACK_RESPONSES`)
- **Current State**: Fixed 5-holding portfolio with hardcoded prices. Canned multi-paragraph responses in `/api/chat` dated March 2026.
- **Genuine Implementation**:
  1. **User Holdings Persistence**:
     - Store holdings in the user's browser `localStorage` or PostgreSQL database (via Prisma).
     - Users can dynamically add, edit, or delete actual shares, quantities, and purchase prices.
  2. **Live CMP Enrichment**:
     - When opening the Chat or Portfolio view, the frontend fetches the current live price (CMP) for all user symbols via `yahooFinance.quote()`.
     - Calculate real-time Net P&L:
       $$\text{P\&L} = (\text{CMP} - \text{AvgCost}) \times \text{Qty}$$
  3. **Live Context Prompting**:
     - The enriched portfolio with **real live CMPs and real P&L** is passed directly to Gemini 2.5 Flash in `/api/chat`.
  4. **Dynamic Algorithmic Fallback**:
     - Instead of static text, the fallback mode calculates rule-based quantitative metrics (portfolio beta, sector concentration percentage, asset allocation ratio) on the fly and renders them in structured markdown.

---

#### 🔵 Blueprint 7: Genuine Market Snapshot on Landing Page (Replacing `MARKET_STATS`)
- **Current State**: Static numbers on `app/page.tsx` (Nifty 22,513, Sensex 74,119, FII +₹2,842Cr, VIX 13.42).
- **Genuine Implementation**:
  - Consume `/api/market` inside `app/page.tsx` using SWR or `useEffect`.
  - When the page loads, NIFTY 50 and SENSEX reflect the actual live trading index quotes fetched from Yahoo Finance (`^NSEI` and `^BSESN`).
  - India VIX is fetched dynamically using symbol `^INDIAVIX`.

---

## 3. Proposed Modern Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GENUINE REAL-TIME ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                               CLIENT LAYER                                  │
│  Next.js 16 App Router · React 19 · Lightweight Charts · React-Markdown    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (REST / SSE Streaming)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            API GATEWAY & ROUTES                             │
│       Zod Validation · Error Boundary · Rate Limiting · Token Bucket        │
│  /api/chart · /api/chart-insights · /api/sectors · /api/fii-dii · /api/chat │
└───────────────────┬──────────────────────────────────┬──────────────────────┘
                    │                                  │
┌───────────────────▼──────────────┐   ┌───────────────▼──────────────────────┐
│      CACHING & PERSISTENCE       │   │           AI & DATA LAYER            │
│  Redis (Upstash) / In-Memory TTL │   │  Gemini 2.5 Flash via @google/genai  │
│  - Ticker Cache (30s)            │   │  - Google Search Grounding           │
│  - OHLCV Cache (1hr)             │   │  - Streaming Responses (SSE)         │
│  - Sector & FII/DII Cache (4hr)  │   │  Technical Analysis Engine           │
│  PostgreSQL / Supabase (Prisma)  │   │  - Dynamic RSI, EMA, Patterns        │
│  - User Portfolios & Watchlists  │   │  Remotion Server / Headless Chromium │
│  - Real Alert History            │   │  - Real MP4 Video Renderings         │
└──────────────────────────────────┘   └──────────────────────────────────────┘
```

### 3.1. Algorithmic Technical Engine Integration
Instead of maintaining static dictionaries, calculate indicators directly from live OHLCV candles:
- **Indicator Library**: Integrate `technicalindicators` to calculate:
  - Moving Averages: EMA 9, SMA 20, EMA 50, SMA 200.
  - Momentum: RSI (14), MACD (12, 26, 9), Stochastic Oscillator (%K, %D).
  - Volatility: Bollinger Bands, ATR.
  - Support / Resistance: Classic, Fibonacci, and Camarilla pivot points.
- **Pattern Recognition**: Programmatically detect Bullish Engulfing, Hammer, Morning Star, Double Bottoms, and Head & Shoulders across all 100 stocks dynamically.

---

### 3.2. Genuine Market Grounding for Opportunity Radar
Eliminate hallucinated news events:
- **NSE / BSE Corporate Announcements API**: Ingest official XBRL corporate filings and bulk deal notices.
- **Gemini Search Grounding**: Enable `googleSearch` tool in `@google/genai`:
  ```ts
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  ```
  This ensures every signal references actual regulatory filings and verified news.

---

### 3.3. Server-Sent Events (SSE) for Real-Time AI Streaming
Replace monolithic `generateContent` calls and fake `setTimeout` delays with token-by-token streaming:
- **Backend Route**:
  ```ts
  import { ai } from "@/lib/gemini";

  export async function POST(req: Request) {
    const { query } = await req.json();
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: query,
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk.text));
        }
        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  ```
- **Frontend Benefit**: Instant response time (< 400ms to first token) and genuine progressive rendering.

---

### 3.4. Resilient Caching Layer for Market Data
Protect upstream APIs and eliminate rate limits:
- **Next.js Route Revalidation**:
  ```ts
  // app/api/market/route.ts
  export const revalidate = 30; // Cache responses globally for 30s
  ```
- **Redis / In-Memory Tier**:
  - Intraday Quotes: 30-second TTL.
  - Daily Historical Candles: 4-hour TTL.
  - Company Fundamentals: 24-hour TTL.

---

### 3.5. Programmatic Video Generation with Remotion
Transform the mock video preview into a real media production engine:
- Install `@remotion/core` and `@remotion/renderer`.
- Construct animated video compositions from React components.
- Synthesize real audio narration via Web Speech API or ElevenLabs.
- Render and export genuine 1080p MP4 market wrap videos for download and social sharing.

---

### 3.6. User Authentication & Persistent Portfolio Management
- **Persistence**: Store portfolios, watchlists, and transaction history in PostgreSQL/Supabase via Prisma ORM.
- **Authentication**: Integrate Clerk or Auth.js (NextAuth) for secure investor login.
- **Broker Integrations**: Connect with Zerodha Kite Connect, Upstox, or Groww APIs to import actual holdings automatically.

---

### 3.7. Component Modularization & File Structure Refactoring
Decompose oversized monolithic page files into focused, reusable components:
- `app/charts/page.tsx` (520 lines) → Decompose into:
  - `components/charts/StockSearchDropdown.tsx`
  - `components/charts/TimeframeSelector.tsx`
  - `components/charts/PatternDetailsCard.tsx`
  - `components/charts/InsightsPanel.tsx`
- `app/video/page.tsx` (484 lines) → Decompose into:
  - `components/video/TemplateSelector.tsx`
  - `components/video/SectorHeatmap.tsx`
  - `components/video/FlowChart.tsx`
  - `components/video/IpoTable.tsx`
- `app/chat/page.tsx` (546 lines) → Decompose into:
  - `components/chat/PortfolioDrawer.tsx`
  - `components/chat/MessageBubble.tsx`
  - `components/chat/SuggestedQueries.tsx`

---

## 4. Prioritized Implementation Roadmap

| Priority | Task | Category | Complexity | Impact |
|---|---|---|---|---|
| **P0** | Sanitize markdown output in `app/chat/page.tsx` using `react-markdown` | Security | Low | Eliminates XSS risk |
| **P0** | Fix uncaught top-level error in `lib/gemini.ts` | Stability | Low | Prevents build & test crashes |
| **P0** | Eliminate hallucination instructions in `/api/radar` | Compliance | Low | Eliminates regulatory liability |
| **P1** | Replace `nifty50Patterns.ts` & `nifty50Insights.ts` with algorithmic indicator engine | Core Engine | High | 100% genuine dynamic patterns for all 100 stocks |
| **P1** | Connect `app/charts/page.tsx` to `/api/chart-insights` | Feature Completion | Medium | Enables live AI insights on chart page |
| **P1** | Replace static `SECTOR_DATA` with live NSE sectoral indices feed (`/api/sectors`) | Market Data | Medium | Real-time sector rotation & heatmap |
| **P1** | Replace static `TOP_MOVERS` with dynamic sorting of NIFTY 100 quotes | Market Data | Low | Real daily gainers and losers |
| **P1** | Add caching layer (Next.js `revalidate` / memory) for Yahoo Finance | Reliability | Medium | Prevents 429 rate-limiting |
| **P1** | Remove artificial delays (`setTimeout`) and fake ticking counters | UX / Integrity | Low | Restores genuine system speed |
| **P2** | Replace static `FII_DII_DATA` with NSE daily institutional trade feed | Market Data | Medium | Real daily institutional flows |
| **P2** | Replace static `IPO_DATA` with live NSE/Chittorgarh IPO feed | Market Data | Medium | Real IPO status and GMPs |
| **P2** | Wire `app/page.tsx` `MARKET_STATS` to `/api/market` | Market Data | Low | Real-time index numbers on home page |
| **P2** | Implement token-by-token streaming in `/api/chat` via SSE | AI Architecture | Medium | Fast, modern streaming UX |
| **P3** | Remotion programmatic MP4 video generation | Advanced Feature | High | Converts mock to actual video generator |
| **P3** | Database persistence & Broker sync for user portfolios | Scalability | High | Real portfolio synchronization |
