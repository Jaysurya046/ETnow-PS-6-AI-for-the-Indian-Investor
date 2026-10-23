# ETNow terminal interface

## Direction

Industrial financial workspace. The primary action is scanning prices and moving between instruments, indicators, portfolio research and briefing preparation. The visual anchor is the numbered workspace rail paired with a stationary benchmark strip and aligned market tables.

Design feasibility score: **14** — impact 4, context fit 5, feasibility 5, performance 4, consistency risk 4. Design guidance: installed `frontend-design` and `ui-ux-pro-max` skills. UI UX Pro Max's verified `data-dense-dashboard` result informs the table-first layouts; its accessibility defaults and local Next.js docs inform implementation. Generic enterprise marketing recommendations were discarded.

## System

- IBM Plex Sans for labels and research; IBM Plex Mono for prices, quantities, percentages, timestamps and numeric controls. `tabular-nums` and lining figures are explicit.
- Charcoal backgrounds, crisp neutral borders, one amber navigation/action accent, semantic red/green with signed numbers and direction labels.
- A 4px spacing basis; 8–14px panel interiors, compact table rows and segmented toolbars. No gradients, glow effects, emoji navigation, moving tickers, or decorative animation.
- Shared tokens and semantic CSS classes in `app/globals.css`. No UI framework or new application dependency.

## Layout

- The workspace is an inline-size query container. Overview, chart and briefing splits adapt to the space available after the navigation rail.
- Wide monitors receive a bounded 2800px working area, wider charts and supporting panels.
- Tablets receive an icon rail; phones receive a fixed five-item bottom navigation with safe-area padding. Split panes stack, holdings become a toggleable mobile pane, and wide tables scroll inside labeled regions.
- Market rows link directly to the selected chart instrument. Header quotes are stationary and horizontally scrollable.

## Interaction and accessibility

Native selects, buttons, forms and disclosure elements replace mouse-only controls. Controls expose their selected/expanded state. Forms have visible labels, keyboard focus is visible, and a skip link targets the workspace. Tables have column and row headers, labeled scroll regions and signed values. On mobile, primary controls have at least 40px height and navigation targets exceed 44px.

Reduced-motion settings disable transitions and scrolling motion. No automatically moving content requires pausing. Existing network feeds, SSE responses, quote validation, local holdings and sanitized markdown remain in use.

The briefing workspace now uses active FII/DII and IPO feeds with explicit source timestamps and stale state. Its Remotion studio shares the terminal typography and colors. See [feed pipelines](feed-pipelines.md) and [video production](video-production.md) for the later milestones.

## Verification

- The original redesign passed `npm run lint`, `npm run build` and 13 regression tests. Subsequent feed, chart, video and deployment work extends the suite to 32 tests; see the README and dated implementation notes for current validation.
- Browser checks at 375px, 768px, 812px landscape, 1024px, 1440px and 3840px confirmed contained layouts. Mobile page width remained within the viewport; wide tables use internal scrolling. The mobile signal region was also verified to scroll with the keyboard without widening the page.
- Verified mover filtering, symbol deep links, chart range selection, signal filtering, visible keyboard focus, the mobile holdings pane, labeled holding entry, live P&L and streaming fallback. The synthetic holding was removed after testing.
- Computed text-token contrast against panel backgrounds: primary 13.65:1, secondary 8.91:1, muted 6.14:1; semantic figure colors all above 7:1. Strong control borders are 3.49:1. This is a targeted check, not a full accessibility conformance audit.
- Research prose renders numeric text in monospace spans after sanitized markdown processing. The markdown XSS regression remains passing.

UI UX Pro Max was installed into the user's Codex skills directory from the requested upstream repository and was used alongside the existing frontend-design skill. No application dependencies were added for the redesign.
