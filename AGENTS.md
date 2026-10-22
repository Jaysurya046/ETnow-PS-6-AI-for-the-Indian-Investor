<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 ETNow AI — Agent Guidelines & Repository Architecture

Welcome to the **ETNow AI** repository. This document serves as the primary operational and architectural guide for AI coding agents (Antigravity, Claude, Cursor, Copilot, etc.) working on this codebase.

---

## 1. Project Overview & Mission

**ETNow AI** is an AI-powered financial market intelligence and portfolio management platform tailored for Indian retail and institutional investors (NSE & BSE). It provides:
- **Live Opportunity Radar**: Real-time signal intelligence across large, mid, and small-cap stocks.
- **Chart Pattern Intelligence**: Interactive candlestick charts (`lightweight-charts`) with automated pattern detection.
- **Market ChatGPT**: Portfolio-aware conversational assistant powered by Google Gemini 2.5 Flash.
- **AI Market Video Engine**: Automated script generation and video dashboard for daily market wraps and sector rotation.
- **Real-Time Market Ticker**: Live quotes for Nifty 50, Sensex, commodities, and key equities.

---

## 2. Actual Technology Stack

Do **not** assume standard starter templates. The actual stack consists of:

| Component | Library / Version | Implementation Notes |
|---|---|---|
| **Framework** | Next.js `16.2.1` | App Router, Turbopack, React Server & Client Components |
| **Runtime** | React `19.2.4` / React DOM `19.2.4` | Modern React with hooks; strictly client-rendered pages use `"use client"` |
| **Language** | TypeScript `^5` | Strict type definitions across components, props, and API handlers |
| **Styling** | **Pure Vanilla CSS** | **NO TailwindCSS**. Styled entirely via CSS custom properties in `app/globals.css` |
| **Charts** | `lightweight-charts` `5.1.0` | TradingView canvas candlestick chart with volume histogram sub-pane |
| **Visualizations** | `recharts` `3.8.1` | SVG bar charts used in market data comparisons |
| **AI Integration** | `@google/genai` `^1.46.0` | Official Google GenAI SDK using model `gemini-2.5-flash` (do not use legacy `@google/generative-ai`) |
| **Financial Data** | `yahoo-finance2` `^3.14.0` | Yahoo Finance client for live quotes, historical OHLCV, and company fundamentals |
| **Icons** | `lucide-react` `^1.7.0` & Custom SVG | Modern UI indicators and branding |

---

## 3. Directory Layout

```
├── app/
│   ├── api/                      # Next.js Server Route Handlers
│   │   ├── chart/                # GET: OHLCV candlestick data
│   │   ├── chart-insights/       # GET: Gemini-powered valuation & technical insights
│   │   ├── chat/                 # POST: Portfolio-aware chat assistant
│   │   ├── market/               # GET: Live ticker quotes for indices & equities
│   │   ├── radar/                # GET: AI Opportunity Radar signals
│   │   └── video/                # POST: AI Market Video Engine scripts & movers
│   ├── charts/page.tsx           # Chart Pattern Intelligence view
│   ├── chat/page.tsx             # Market ChatGPT interface
│   ├── radar/page.tsx            # Opportunity Radar signal feed
│   ├── video/page.tsx            # AI Market Video Engine preview
│   ├── layout.tsx                # App shell (Sidebar + Header + Main Content)
│   ├── page.tsx                  # Landing / Home dashboard
│   └── globals.css               # Global theme tokens, cards, badges, and animations
├── components/
│   ├── Header.tsx                # Top navigation with live auto-scrolling ticker
│   └── Sidebar.tsx               # Fixed left navigation bar
├── lib/
│   ├── gemini.ts                 # Google GenAI client instance
│   ├── yahoo.ts                  # yahoo-finance2 client instance
│   ├── nifty100.ts               # Universe of 100 NSE stocks (ticker, name, sector, cap)
│   ├── nifty50Insights.ts        # Pre-calculated technical & quantitative insights (50 stocks)
│   └── nifty50Patterns.ts        # Chart patterns, win rates, entry, stop loss, targets (50 stocks)
├── implementationReport.md       # Detailed audit of actual project implementation
├── Improvements.md               # Known issues, bug audits, and architectural roadmap
├── .env.local                    # Local environment variables
└── package.json                  # Scripts & dependencies
```

---

## 4. Key Development Commands

Run all shell commands from the project root:

```bash
# Start local development server with Turbopack (default: http://localhost:3000)
npm run dev

# Run ESLint validation
npm run lint

# Compile production build
npm run build

# Start production server
npm start
```

---

## 5. Coding Standards & Conventions

### 5.1. Next.js 16 Conventions
- **Asynchronous Route Parameters**: In Next.js 16, dynamic route `params` and `searchParams` are Promises. Always await them:
  ```ts
  // Correct in Next.js 16
  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    ...
  }
  ```
- **Client vs Server Components**: Place `"use client"` at the very top of interactive components utilizing React hooks (`useState`, `useEffect`, `useRef`). Route handlers under `app/api/` are server-only.

### 5.2. Styling & CSS Rules
- **NEVER use Tailwind utility classes** (e.g. `flex items-center bg-gray-900 text-white`). Tailwind is not installed.
- **Use CSS Variables** defined in `app/globals.css`:
  - Accent Colors: `var(--gold)` (`#f0b429`), `var(--green)` (`#22c55e`), `var(--red)` (`#ef4444`), `var(--orange)` (`#f97316`), `var(--purple)` (`#a855f7`)
  - Backgrounds: `var(--bg-main)` (`#09090f`), `var(--bg-card)` (`#11111e`), `var(--bg-subtle)` (`#161628`)
  - Text: `var(--text-primary)` (`#f8fafc`), `var(--text-secondary)` (`#94a3b8`), `var(--text-muted)` (`#475569`)
  - Borders: `var(--border-subtle)` (`rgba(255,255,255,0.06)`), `var(--border-strong)` (`rgba(255,255,255,0.12)`)
  - Utility Classes: `.page`, `.page-header`, `.page-title`, `.page-subtitle`, `.badge`, `.btn`, `.btn-primary`, `.btn-ghost`, `.input`.

### 5.3. Financial Formatting & Conventions
- **Indian Rupee**: Format INR currency with the `₹` symbol (e.g., `₹2,842Cr`, `₹1,450.50`). Use `en-IN` locale (`value.toLocaleString("en-IN")`).
- **US Commodities**: Use `$` prefix for global commodities (Gold `GC=F`, Crude `CL=F`).
- **NSE Symbols**: Yahoo Finance requires the `.NS` suffix for National Stock Exchange tickers (e.g., `RELIANCE.NS`, `HDFCBANK.NS`, `TCS.NS`). Use `lib/nifty100.ts` for clean mapping.

### 5.4. Google GenAI SDK Usage
- Always import from `@google/genai`:
  ```ts
  import { GoogleGenAI } from "@google/genai";
  ```
- Use the `gemini-2.5-flash` model for fast, structured financial analysis.
- Use `config: { responseMimeType: "application/json" }` when requesting structured JSON data.

---

## 6. Critical Rules & Guardrails for AI Agents

1. **No Artificial Financial Hallucinations**:
   - Never instruct the LLM to invent fake corporate insider actions, SEBI regulatory notices, or fake bulk deals.
   - Ground prompts in real data provided by `yahoo-finance2` or verified financial context.
2. **Sanitize Markdown & HTML**:
   - Do not inject unsanitized HTML via `dangerouslySetInnerHTML`. Always use sanitized markdown renderers.
3. **Preserve Fallback Resilience**:
   - The platform includes fallback responses in `/api/chat` to protect against Gemini quota exhaustion (HTTP 429). Do not delete fallback handlers.
4. **Do Not Introduce Unrequested Dependencies**:
   - Do not add TailwindCSS, UI component libraries, or alternative state managers unless explicitly instructed.
5. **Keep Code Type-Safe**:
   - Ensure all API payloads and component interfaces have explicit TypeScript types.
