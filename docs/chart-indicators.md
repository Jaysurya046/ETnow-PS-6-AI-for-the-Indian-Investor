# Interactive chart indicators

`/api/chart` calculates `indicatorSeries` from the same warm-up OHLCV history used by the scalar technical engine. Only points within the selected visible candle range are returned. This preserves EMA 200 and RSI initialization on short views without plotting extra historical bars.

- EMA 20, 50 and 200 use close prices and SMA-seeded EMA calculations from `technicalindicators`.
- Bollinger (20,2) returns upper/middle/lower bands; the middle is the rolling SMA. Flat windows correctly produce coincident bands.
- RSI 14 needs 15 closes for its first point. All series are chronological and deduplicated; insufficient history produces empty series.
- Periods mean bars at the chosen interval, rather than always daily sessions.

`components/CandlestickChart.tsx` owns the chart, line references and ResizeObserver. Its canvas remounts for instrument/range changes; the surrounding toolbar retains indicator preferences. EMA 20/50 and RSI are initially enabled. Toggling overlays changes series visibility; disabling RSI removes its series and native pane. Unmounting disconnects the observer and removes the chart and all owned series/price lines.

RSI uses a native Lightweight Charts pane, sharing the price chart's time axis and crosshair. This synchronizes scrolling and zooming without duplicate charts or reciprocal range subscriptions. The pane is kept at 100px on resize, with a 0–100 scale and 70/50/30 threshold lines. Price-axis dragging is disabled to preserve that fixed oscillator scale; time-axis, wheel and pinch zoom remain available.

The installed Lightweight Charts 5.1 `LineWidth` type only accepts 1, 2, 3 or 4. EMA and RSI lines therefore use 2px instead of the requested unsupported 1.5px. Bollinger lines are 1px. Colors live in CSS variables; toolbar buttons expose `aria-pressed`, visible keyboard focus and 44px mobile touch targets.

The canvas uses available container width through ResizeObserver and gains 104px when RSI is enabled, preserving the main pane's working area. Routine data refreshes do not clear the chart or call fitContent again. See `tests/core.test.mjs` for alignment, bounds, edge-case and warm-up regression coverage.

Reference: https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes

Verified against the production build at real iframe viewport widths:

| Viewport | Document width | Chart width | RSI pane height |
| --- | --- | --- | --- |
| 375px | 369px | 343px | 100px |
| 768px | 761px | 652px | 100px |
| 1440px | 1440px | 891px | 100px |
| 3840px | 3840px | 2359px | 100px |

Scrollbar space explains the smaller document widths on narrow layouts. No viewport had canvas overflow. RSI removal reduced the chart's canvas count from 11 to 7; restoration returned it to 11. Instrument and range changes retained active toggle preferences. Browser console checks returned no chart warnings or errors. Validation: 25 tests passed, ESLint clean, production build successful.
Range transitions additionally gate candles and overlay data by the loaded instrument/range key, so a fresh canvas fits only its own data.
