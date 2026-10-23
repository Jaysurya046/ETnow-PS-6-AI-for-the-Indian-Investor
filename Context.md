# Context — Agentic IDE Operational Guidelines

This document provides concise project instructions, commands, and conventions for Codex when developing in the **ETNow AI** repository. For full architectural specifications, see [AGENTS.md](AGENTS.md).

---

## 🚀 Key Commands

Run from the repository root (`c:\Users\jayas\OneDrive\Desktop\web_development\ET-gen-ai-main`):

```bash
# Development server (Turbopack)
npm run dev

# Linting & code validation
npm run lint

# Production build
npm run build

# Start production server
npm start
```

---

## 🏗️ Architecture & Technology Stack

- **Framework**: Next.js `16.2.1` (App Router, Turbopack)
- **Runtime**: React `19.2.4` / React DOM `19.2.4`
- **Language**: TypeScript `^5` (strict typing)
- **Styling**: **Pure Vanilla CSS** via `app/globals.css`. **Do NOT use TailwindCSS** (Tailwind is not installed).
- **Charts & Data Viz**:
  - `lightweight-charts` `5.1.0` (Candlestick charts with volume histograms)
  - `recharts` `3.8.1` (SVG bar charts for market flows and sector comparisons)
- **AI Engine**: `@google/genai` `1.46.0` using `gemini-2.5-flash`
- **Market Data**: `yahoo-finance2` `3.14.0` (NSE tickers require `.NS` suffix)

---

## 📂 Core Project Structure

- `app/`
  - `page.tsx`: Landing dashboard with hero section and module launch cards
  - `radar/page.tsx`: Live Opportunity Radar signal feed with sector/cap filtering
  - `charts/page.tsx`: Candlestick charts and technical pattern detection (NIFTY 100)
  - `chat/page.tsx`: Portfolio-aware financial conversational assistant
  - `video/page.tsx`: AI Market Video Engine preview dashboard
  - `api/chart/route.ts`: GET endpoint returning OHLCV candle data
  - `api/chart-insights/route.ts`: GET endpoint for AI fundamental and technical analysis
  - `api/chat/route.ts`: POST endpoint for chat with offline fallback cache
  - `api/market/route.ts`: GET endpoint providing ticker quotes for indices and commodities
  - `api/radar/route.ts`: GET endpoint generating structured AI market signals
  - `api/video/route.ts`: POST endpoint generating 45s market scripts and top movers
  - `layout.tsx`: App shell wrapping Sidebar and Header around page content
  - `globals.css`: Dark-mode design system and CSS variable tokens
- `components/`
  - `Header.tsx`: Auto-scrolling ticker bar polling `/api/market` every 30s
  - `Sidebar.tsx`: Persistent vertical navigation menu
- `lib/`
  - `gemini.ts`: Google GenAI SDK client instantiation
  - `yahoo.ts`: `yahoo-finance2` client instance
  - `nifty100.ts`: 100 NSE stock definitions (symbols, names, sectors, cap)
  - `nifty50Insights.ts`: Static fundamental and technical insights for Nifty 50 stocks
  - `nifty50Patterns.ts`: Static chart patterns, win rates, and targets for Nifty 50 stocks

---

## 🎨 Coding & Style Standards

1. **Vanilla CSS Tokens**:
   - Use CSS custom properties defined in `app/globals.css`:
     - Accents: `var(--gold)`, `var(--green)`, `var(--red)`, `var(--orange)`, `var(--purple)`
     - Backgrounds: `var(--bg-main)`, `var(--bg-card)`, `var(--bg-subtle)`
     - Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
     - Borders: `var(--border-subtle)`, `var(--border-strong)`
   - Never write inline Tailwind utility classes.
2. **Next.js 16 App Router**:
   - Explicitly add `"use client"` at the top of client components using React hooks (`useState`, `useEffect`, `useRef`).
   - Route handlers under `app/api/` are server-only. Dynamic `searchParams` and `params` are asynchronous in Next.js 16.
3. **Currency & Locale**:
   - Indian stocks and figures use `₹` and Indian number formatting (`toLocaleString("en-IN")`).
   - US commodities use `$` (e.g. Gold `GC=F`, Crude `CL=F`).
   - NSE ticker symbols must include `.NS` when querying Yahoo Finance (e.g. `RELIANCE.NS`).
4. **Google GenAI SDK**:
   - Always use `@google/genai` (not the deprecated `@google/generative-ai` package).
   - Use `gemini-2.5-flash` for fast responses and JSON structured outputs (`responseMimeType: "application/json"`).

---

## ⚠️ Key Caveats & Guardrails

- **XSS Protection**: Never use `dangerouslySetInnerHTML` with raw LLM outputs or user input without sanitization.
- **No Hallucinated News**: Do not instruct Gemini to fabricate insider trades or regulatory filings. Ground analysis in live data from `yahoo-finance2`.
- **Environment Variables**: Requires `GEMINI_API_KEY` in `.env.local`.
- **Quota Resilience**: Maintain fallback response logic in `/api/chat` to gracefully handle Gemini 429 quota exhaustion.
