# NSE institutional and IPO feeds

The Market briefing workspace consumes `/api/fii-dii` and `/api/ipo`. Both routes run on the Node runtime and return typed JSON with acquisition timestamps (`asOf`, ISO UTC) and an explicit `isStale` indicator. The interface renders those timestamps in IST.

## Institutional cash flows

- Primary: https://www.nseindia.com/api/fiidiiTradeReact
- Historical backfill: https://upstox.com/fii-dii-data/ (first, cash-market table only).
- NSE provides the latest session pair. The adapter joins FII/FPI and DII by session date, validates nonnegative gross values, recomputes each net to two decimal places, merges verified history chronologically, deduplicates sessions, and retains at most 30 sessions.
- All figures are rupees in crore. Historical net figures are recalculated from gross purchases and sales, never inferred from derivatives activity.
- The initial verified snapshot contains 14 sessions, including the NSE close for 22 October 2026. Each source capture has its own timestamp in `lib/data/`. These are fallback records, not simulated data.
- Cache: two hours on weekdays 09:00–18:00 IST and twelve hours outside that window, shortened at the next publication/market boundary. This uses clock windows, not an exchange holiday calendar. Concurrent loads share one promise.

## IPO issues

- Current subscriptions: https://www.nseindia.com/api/ipo-current-issue
- Current/upcoming calendar: https://www.nseindia.com/api/all-upcoming-issues?category=ipo
- Listed calendar: https://www.nseindia.com/api/public-past-issues
- Only equity/SME issue categories are included. Open/close dates are compared using the Indian calendar. A closed bid alone never implies listing; a published listing date must have reached its opening session. Legacy re-admissions long after offer closure are excluded.
- NSE publishes `issueSize` as shares. The UI explicitly preserves that unit, rather than presenting a share count as rupees. Unpublished QIB/NII/retail subscription details and GMP remain absent.
- Listing gain is the historical listing-session close versus the published issue price, sourced from Yahoo Finance with `.NS` symbols. It is only calculated after that session closes, in bounded batches with request timeouts. Missing price history remains unavailable; today's price is never substituted.
- Cache: one hour. Any failure of the three required NSE feeds returns the previous coherent snapshot as stale. Individual unavailable Yahoo listing prices leave their fields blank.

## Resilience and deployment

NSE requests use browser headers, a normal cookie session bootstrap, bounded timeouts, and one session refresh on HTTP 401/403. No challenge bypass is attempted. The shared stale cache keeps one value and one in-flight request per feed, preserves the original acquisition timestamp during outages, and backs off failures for five minutes. Responses use `Cache-Control: no-store` so intermediary caches cannot disguise stale state.

Last successful values and rolling history are per-process. Restarts use the checked-in, explicitly stale source captures; multi-instance deployments do not share refreshed data. Deployments needing shared persistence should store the same records in a durable cache. Capture timestamps are preserved in the JSON files and source URLs are listed above; update those verified captures during maintenance rather than inventing new fallback values.

The UI polls every five minutes; server TTLs prevent that polling from repeatedly hitting NSE. Session details provide a keyboard-accessible table alongside the grouped chart. Numbers use IBM Plex Mono and tabular figures, existing theme tokens, and horizontal scrolling inside narrow tables.

