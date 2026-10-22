# 🛠️ ETNow AI — Issues & Architectural Improvements

This document provides an engineering audit of the current codebase implementation, highlighting critical bugs, design flaws, compliance risks, and outlining concrete architectural improvements to elevate the platform to an enterprise-grade standard.

---

## 1. Issues in the Actual Implementation

### 1.1. Critical Security Vulnerability: Unsanitized HTML in Chat UI
- **Location**: `app/chat/page.tsx` (Lines 237, 246)
- **Issue**: The `renderContent()` function uses `dangerouslySetInnerHTML` with rudimentary regex replacement:
  ```tsx
  dangerouslySetInnerHTML={{
    __html: line.replace(/\*\*(.+?)\*\*/g, '<strong ...>$1</strong>')
  }}
  ```
- **Risk**: Stored or reflected Cross-Site Scripting (XSS). If Gemini outputs raw HTML, scripts, or unescaped markdown containing `<img src=x onerror=...>`, or if user queries containing malicious payloads are echoed back, arbitrary scripts can execute in the user's browser.
- **Fix**: Replace manual HTML injection with a vetted markdown component such as `react-markdown` configured with `rehype-sanitize`.

---

### 1.2. Runtime Crash on Missing Environment Variables
- **Location**: `lib/gemini.ts` (Lines 5–7)
- **Issue**: Top-level exception throwing:
  ```ts
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }
  ```
- **Impact**: Any file or route importing `lib/gemini.ts` crashes during static analysis, CI pipelines, unit testing, or Next.js build time if `GEMINI_API_KEY` is temporarily missing from the execution environment.
- **Fix**: Lazy-initialize the Gemini client inside request handlers or create a helper function that returns `GoogleGenAI | null` and handles missing keys gracefully.

---

### 1.3. Regulatory & Ethical Compliance: Prompted AI Hallucination in Radar
- **Location**: `app/api/radar/route.ts` (Line 20)
- **Issue**: The prompt sent to Gemini explicitly instructs the model to invent fake financial events:
  ```text
  "Invent plausible real-time 'news' or 'events' (like bulk deals, SEC filings, insider buys) that justify the current price action for these exact 8 stocks."
  ```
- **Impact**: Fabricating insider trading, promoter buybacks, and SEBI regulatory filings presents severe compliance and legal risks under SEBI (Prohibition of Fraudulent and Unfair Trade Practices) guidelines. Users acting on hallucinated insider deals could suffer real financial losses.
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
- **Fix**: Implement in-memory caching or Redis caching with Next.js `unstable_cache` or Route Segment Config (`export const revalidate = 30`).

---

### 1.11. Documentation Discrepancies in `README.md`
- **Issue**:
  - Claims **TailwindCSS** is part of the stack (line 5), but the application actually uses Vanilla CSS with no Tailwind dependencies.
  - Claims **38 data sources** and live FII/DII tracking, whereas FII/DII and IPO figures are static hardcoded arrays.
  - Claims automated video encoding when it is purely an animated CSS dashboard.
- **Fix**: Align `README.md` with the actual codebase capabilities.

---

## 2. Architectural Improvements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROPOSED MODERN ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                               CLIENT LAYER                                  │
│  Next.js 16 App Router · React 19 · Lightweight Charts · React-Markdown    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (REST / SSE Streaming)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            API GATEWAY & ROUTES                             │
│       Zod Validation · Error Boundary · Rate Limiting · Token Bucket        │
└───────────────────┬──────────────────────────────────┬──────────────────────┘
                    │                                  │
┌───────────────────▼──────────────┐   ┌───────────────▼──────────────────────┐
│      CACHING & PERSISTENCE       │   │           AI & DATA LAYER            │
│  Redis (Upstash) / In-Memory TTL │   │  Gemini 2.5 Flash via @google/genai  │
│  - Ticker Cache (30s)            │   │  - Google Search Grounding           │
│  - OHLCV Cache (1hr)             │   │  - Streaming Responses (SSE)         │
│  PostgreSQL / Supabase (Prisma)  │   │  Technical Analysis Engine           │
│  - User Portfolios & Watchlists  │   │  - Dynamic RSI, EMA, Patterns        │
│  - Real Alert History            │   │  Remotion Server / Headless Chromium │
│                                  │   │  - Real MP4 Video Renderings         │
└──────────────────────────────────┘   └──────────────────────────────────────┘
```

### 2.1. Dynamic Algorithmic Technical Analysis Engine
Instead of maintaining static dictionaries (`nifty50Patterns.ts`), calculate technical indicators and chart patterns directly from OHLCV candles:
- **Indicator Library**: Integrate `technicalindicators` to calculate:
  - Moving Averages: EMA 9, SMA 20, EMA 50, SMA 200.
  - Momentum: RSI (14), MACD (12, 26, 9), Stochastic Oscillator (%K, %D).
  - Volatility: Bollinger Bands, ATR.
  - Support / Resistance: Classic, Fibonacci, and Camarilla pivot points.
- **Pattern Detection**: Programmatically detect Bullish Engulfing, Hammer, Morning Star, Double Bottoms, and Head & Shoulders across all 100 stocks dynamically.

---

### 2.2. Genuine Market Grounding for Opportunity Radar
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

### 2.3. Server-Sent Events (SSE) for Real-Time AI Streaming
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

### 2.4. Resilient Caching Layer for Market Data
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

### 2.5. Programmatic Video Generation with Remotion
Transform the mock video preview into a real media production engine:
- Install `@remotion/core` and `@remotion/renderer`.
- Construct animated video compositions from React components.
- Synthesize real audio narration via Web Speech API or ElevenLabs.
- Render and export genuine 1080p MP4 market wrap videos for download and social sharing.

---

### 2.6. User Authentication & Persistent Portfolio Management
- **Persistence**: Store portfolios, watchlists, and transaction history in PostgreSQL/Supabase via Prisma ORM.
- **Authentication**: Integrate Clerk or Auth.js (NextAuth) for secure investor login.
- **Broker Integrations**: Connect with Zerodha Kite Connect, Upstox, or Groww APIs to import actual holdings automatically.

---

### 2.7. Component Modularization & File Structure Refactoring
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

## 3. Prioritized Implementation Roadmap

| Priority | Task | Category | Complexity | Impact |
|---|---|---|---|---|
| **P0** | Sanitize markdown output in `app/chat/page.tsx` using `react-markdown` | Security | Low | Eliminates XSS risk |
| **P0** | Fix uncaught top-level error in `lib/gemini.ts` | Stability | Low | Prevents build & test crashes |
| **P0** | Eliminate hallucination instructions in `/api/radar` | Compliance | Low | Eliminates regulatory liability |
| **P1** | Connect `app/charts/page.tsx` to `/api/chart-insights` | Feature Completion | Medium | Enables real-time AI insights |
| **P1** | Add caching layer (Next.js `revalidate` / memory) for Yahoo Finance | Reliability | Medium | Prevents 429 rate-limiting |
| **P1** | Remove artificial delays (`setTimeout`) and fake ticking counters | UX / Integrity | Low | Restores genuine system speed |
| **P2** | Dynamic technical indicator calculation for full Nifty 100 universe | Core Engine | High | Expands coverage to all stocks |
| **P2** | Implement token-by-token streaming in `/api/chat` via SSE | AI Architecture | Medium | Fast, modern streaming UX |
| **P3** | Remotion programmatic MP4 video generation | Advanced Feature | High | Converts mock to actual video generator |
| **P3** | Database persistence & Broker sync for user portfolios | Scalability | High | Real portfolio synchronization |
