import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const runtimeRequire = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

// Load application TypeScript with optional provider fakes, without another test dependency.
function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    if (relative in mocks) return mocks[relative];
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = path.join(root, relative);
    const loaded = { exports: {} };
    cache.set(relative, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const resolve = id => id.startsWith("@/") ? load(id.slice(2)+".ts") : runtimeRequire(id);
    new Function("require", "module", "exports", code)(resolve, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}

const load = loader();
const { calculateIndicators } = load("lib/indicators.ts");
const { portfolioTotals, parseHoldings } = load("lib/portfolio.ts");
const { readChatStream } = load("lib/chat-stream.ts");
const { ttlCache } = load("lib/cache.ts");
const candles = Array.from({ length: 250 }, (_, i) => ({ time: Math.floor(Date.now()/1000)-(249-i)*86400, open: 100+i, high: 102+i, low: 99+i, close: 101+i, volume: 1000 }));

test("indicator math has enough history for EMA200 and uses previous-bar pivots", () => {
  const result = calculateIndicators(candles);
  assert.equal(result.rsi, 100);
  assert.ok(Math.abs(result.ema[9]-346) < 1e-8);
  assert.ok(Math.abs(result.ema[200]-250.5) < 1e-8);
  assert.ok(Math.abs(result.macd.value-7) < 1e-8);
  assert.ok(Math.abs(result.macd.histogram) < 1e-8);
  const p = (350+347+349)/3;
  assert.ok(Math.abs(result.pivots.Classic.pivot-p) < 1e-8);
  assert.ok(Math.abs(result.pivots.Classic.r1-(2*p-347)) < 1e-8);
  assert.ok(Math.abs(result.pivots.Camarilla.r1-(349+3*1.1/12)) < 1e-8);
  assert.ok(Math.abs(result.pivots.Fibonacci.s1-(p-3*0.382)) < 1e-8);
});

test("short/empty/invalid candle history never fabricates long indicators", () => {
  const empty = calculateIndicators([]);
  assert.equal(empty.rsi, null); assert.equal(empty.ema[200], null); assert.equal(empty.pivots, null);
  const short = calculateIndicators(candles.slice(0, 14));
  assert.equal(short.rsi, null); assert.equal(short.ema[21], null); assert.equal(short.macd.signal, null);
  assert.equal(calculateIndicators([...candles, { ...candles[0], close: NaN }]).bars, 250);
});

test("engulfing and resistance breakouts depend on measured candle changes", () => {
  const previous = { time: 1, open: 105, close: 100, high: 106, low: 99, volume: 100 };
  const current = { time: 2, open: 99, close: 107, high: 108, low: 98, volume: 200 };
  assert.ok(calculateIndicators([previous, current]).patterns.includes("Bullish engulfing"));
  const breakout = [...candles.slice(0, 21), { ...candles[21], close: 200, high: 201, volume: 2000 }];
  assert.ok(calculateIndicators(breakout).patterns.some(p => p.includes("resistance breakout with elevated volume")));
});

test("portfolio validation rejects bad inputs and excludes missing prices from P&L", () => {
  assert.equal(parseHoldings([{ symbol: "<script>", qty: 1, avgCost: 1 }]), null);
  assert.equal(parseHoldings([{ symbol: "TCS", qty: -1, avgCost: 1 }]), null);
  assert.equal(parseHoldings([{ symbol: "TCS", qty: 1, avgCost: Infinity }]), null);
  const items = parseHoldings([{ symbol: "TCS.NS", qty: 2, avgCost: 100 }, { symbol: "INFY", qty: 1, avgCost: 200 }]);
  assert.equal(items[0].symbol, "TCS");
  const totals = portfolioTotals([{ ...items[0], cmp: 110 }, items[1]]);
  assert.deepEqual(totals, { cost: 200, value: 220, pnl: 20, pnlPct: 10, priced: 1, missing: 1 });
  assert.equal(portfolioTotals([]).pnlPct, 0);
});

test("cache shares concurrent loads, separates keys, expires, and retries failures", async () => {
  let calls = 0;
  const cached = ttlCache(async key => { calls++; return key; }, 0);
  assert.deepEqual(await Promise.all([cached("a"), cached("a")]), ["a", "a"]);
  assert.equal(calls, 1);
  await cached("a"); await cached("b"); assert.equal(calls, 3);
  let failures = 0;
  const fail = ttlCache(async () => { failures++; throw new Error("offline"); });
  await assert.rejects(fail()); await assert.rejects(fail()); assert.equal(failures, 2);
});

test("SSE reader preserves rupee/emoji text across single-byte UTF-8 chunks and CRLF frames", async () => {
  const payload = 'data: {"type":"delta","text":"₹100 📈"}\r\n\r\ndata: {"type":"done","sources":[],"suggestions":[]}\n\n';
  const bytes = new TextEncoder().encode(payload);
  const response = new Response(new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } }));
  const events = [];
  await readChatStream(response, e => events.push(e));
  assert.equal(events[0].text, "₹100 📈"); assert.equal(events[1].type, "done");
  await assert.rejects(readChatStream(new Response('data: {"type":"delta","text":"partial"}\n\n'), () => {}), /ended early/);
});

test("markdown renderer removes raw HTML and unsafe link protocols", () => {
  const { default: SafeMarkdown } = load("components/SafeMarkdown.tsx");
  const { renderToStaticMarkup } = runtimeRequire("react-dom/server");
  const { createElement } = runtimeRequire("react");
  const html = renderToStaticMarkup(createElement(SafeMarkdown, { children: '**Safe** <img src=x onerror="alert(1)"><script>alert(1)</script> [bad](javascript:alert%281%29)' }));
  assert.ok(html.includes("<strong>Safe</strong>"));
  assert.doesNotMatch(html, /<script|<img|onerror=|javascript:/i);
});

test("Gemini module imports without a key and returns null", () => {
  const prior = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try { assert.equal(loader()("lib/gemini.ts").getGenAI(), null); }
  finally { if (prior !== undefined) process.env.GEMINI_API_KEY = prior; }
});

test("every configured stock, including stocks beyond 50, can obtain computed chart analysis", async () => {
  const { NIFTY_100 } = load("lib/nifty100.ts");
  const fixtureLoader = loader({ "lib/yahoo.ts": { __esModule: true, default: { chart: async () => ({ quotes: candles.map(c => ({ ...c, date: new Date(c.time*1000) })) }) } } });
  const { getChartData } = fixtureLoader("lib/chart-data.ts");
  assert.equal(NIFTY_100.length, 100);
  assert.equal(new Set(NIFTY_100.map(stock => stock.sym)).size, 100);
  for (const stock of NIFTY_100) {
    const data = await getChartData(stock.sym, "1M");
    assert.equal(data.analysis.bars, 250); assert.notEqual(data.analysis.ema[200], null); assert.ok(data.candles.length > 0);
  }
});

test("movers rank the entire universe and do not fill missing quotes with fake zero prices", async () => {
  let symbols;
  const fixtureLoader = loader({ "lib/yahoo.ts": { __esModule: true, default: { quote: async input => {
    symbols = input;
    return [{ symbol: "TCS.NS", regularMarketPrice: 100, regularMarketChangePercent: 3 }, { symbol: "INFY.NS", regularMarketPrice: 200, regularMarketChangePercent: -2 }, { symbol: "ONGC.NS", regularMarketChangePercent: 10 }];
  } } } });
  const data = await fixtureLoader("lib/market-data.ts").getMovers();
  assert.equal(symbols.length, 100); assert.equal(data.coverage, 2);
  assert.equal(data.gainers[0].stock, "TCS"); assert.equal(data.losers[0].stock, "INFY");
});

test("chat route streams before generation completes and replaces partial text on quota failure", async () => {
  const fixtureLoader = loader({
    "lib/portfolio-data.ts": { enrichHoldings: async h => h.map(item => ({ ...item, cmp: 110, quoteTime: "2026-10-22T10:00:00Z" })) },
    "lib/gemini.ts": { getGenAI: () => ({ models: { generateContentStream: async function* () {
      yield { text: "partial" }; throw new Error("429 RESOURCE_EXHAUSTED");
    } } }) },
  });
  const { POST } = fixtureLoader("app/api/chat/route.ts");
  const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ query: "my portfolio", portfolio: [{ symbol: "TCS", qty: 2, avgCost: 100 }], stream: true }) }));
  assert.match(response.headers.get("Content-Type"), /text\/event-stream/);
  const events = []; await readChatStream(response, event => events.push(event));
  assert.equal(events[0].type, "status"); assert.ok(events.some(e => e.type === "delta" && e.text === "partial"));
  const fallback = events.find(e => e.type === "fallback");
  assert.match(fallback.content, /quota/); assert.match(fallback.content, /₹20/);
  assert.equal(events.at(-1).type, "done");
  const invalid = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ query: 123 }) }));
  assert.equal(invalid.status, 400);
});

test("chat missing-key and provider failure fallback stays usable in JSON and SSE", async () => {
  const fixtureLoader = loader({ "lib/portfolio-data.ts": { enrichHoldings: async () => { throw new Error("offline"); } }, "lib/gemini.ts": { getGenAI: () => null } });
  const { POST } = fixtureLoader("app/api/chat/route.ts");
  for (const stream of [false, true]) {
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ query: "my portfolio", portfolio: [{ symbol: "TCS", qty: 2, avgCost: 100 }], stream }) }));
    assert.equal(response.status, 200);
    let content;
    if (stream) await readChatStream(response, e => { if (e.type === "fallback") content = e.content; });
    else content = (await response.json()).content;
    assert.match(content, /configuration/); assert.match(content, /excluded/); assert.doesNotMatch(content, /₹0/);
  }
});

test("chat emits a status immediately and delivers successful Gemini tokens incrementally", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const fixtureLoader = loader({
    "lib/portfolio-data.ts": { enrichHoldings: async h => h },
    "lib/gemini.ts": { getGenAI: () => ({ models: { generateContentStream: async function* () {
      await gate; yield { text: "Hello " }; yield { text: "₹100" };
    } } }) },
  });
  const response = await fixtureLoader("app/api/chat/route.ts").POST(new Request("http://localhost/api/chat", {
    method: "POST", body: JSON.stringify({ query: "Explain portfolio P&L", portfolio: [], stream: true }),
  }));
  const events = [];
  let statusSeen;
  const status = new Promise(resolve => { statusSeen = resolve; });
  const reading = readChatStream(response, event => { events.push(event); if (event.type === "status") statusSeen(); });
  await status;
  assert.equal(events.some(e => e.type === "delta"), false);
  release(); await reading;
  assert.equal(events.filter(e => e.type === "delta").map(e => e.text).join(""), "Hello ₹100");
  assert.equal(events.at(-1).type, "done");
});
