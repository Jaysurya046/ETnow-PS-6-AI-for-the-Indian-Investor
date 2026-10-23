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
    if (relative.endsWith(".json")) return JSON.parse(readFileSync(filename, "utf8"));
    const loaded = { exports: {} };
    cache.set(relative, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const resolve = id => id in mocks ? mocks[id] : id.startsWith("@/") ? load(id.slice(2)+(id.endsWith(".json") ? "" : ".ts")) : runtimeRequire(id);
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

test("Gemini model resolution retries 404/503 once per model and preserves other failures", async () => {
  const { withGeminiModel } = load("lib/gemini.ts");
  const tried = [];
  const result = await withGeminiModel("custom-model", async model => {
    tried.push(model);
    if (tried.length === 1) throw Object.assign(new Error("missing"), {status:404});
    if (tried.length === 2) throw Object.assign(new Error("busy"), {status:503});
    return "ok";
  });
  assert.equal(result,"ok");
  assert.deepEqual(tried,["custom-model","gemini-2.5-flash-lite","gemini-3.8-flash"]);
  for (const status of [429,401,400]) {
    let calls = 0;
    await assert.rejects(withGeminiModel("custom",async()=>{ calls++; throw Object.assign(new Error("failure"),{status}); }));
    assert.equal(calls,1);
  }
  let calls = 0;
  await assert.rejects(withGeminiModel("gemini-2.5-flash-lite",async()=>{ calls++;throw new Error("503 UNAVAILABLE"); }));
  assert.equal(calls,2);
  calls=0;
  await assert.rejects(withGeminiModel("custom",async()=>{calls++;throw new Error("404 NOT_FOUND");},()=>false));
  assert.equal(calls,1);
});

test("Gemini model honors a deployment override and defaults to flash-lite", () => {
  const original=process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.equal(loader()("lib/gemini.ts").DEFAULT_GEMINI_MODEL,"gemini-2.5-flash-lite");
    process.env.GEMINI_MODEL="custom-deployment-model";
    assert.equal(loader()("lib/gemini.ts").DEFAULT_GEMINI_MODEL,"custom-deployment-model");
  } finally { if(original===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=original; }
});

test("research fallbacks distinguish requested stocks, portfolio, education and general queries", async () => {
  const quote={symbol:"RELIANCE.NS",regularMarketPrice:1420,regularMarketChangePercent:1.2,regularMarketDayLow:1400,regularMarketDayHigh:1430,fiftyTwoWeekLow:1200,fiftyTwoWeekHigh:1600,regularMarketTime:new Date("2026-10-23T10:00:00Z")};
  const {POST}=loader({
    "lib/gemini.ts":{...load("lib/gemini.ts"),getGenAI:()=>null},
    "lib/portfolio-data.ts":{enrichHoldings:async h=>h.map(row=>({...row,cmp:110}))},
    "lib/market-data.ts":{getQuotes:async symbols=>{assert.deepEqual(symbols,["RELIANCE.NS"]);return [quote];}},
  })("app/api/chat/route.ts");
  const ask=async query=>(await (await POST(new Request("http://local/api/chat",{method:"POST",body:JSON.stringify({query,portfolio:[{symbol:"TCS",qty:2,avgCost:100}]})}))).json()).content;
  const stock=await ask("Analyze RELIANCE.NS");
  assert.match(stock,/RELIANCE/);assert.match(stock,/₹1,420/);assert.match(stock,/\+1.20%/);assert.match(stock,/₹1,200/);assert.match(stock,/charts\?symbol=RELIANCE/);assert.doesNotMatch(stock,/Priced holdings value/);
  const portfolio=await ask("Review my portfolio risk and pnl");
  assert.match(portfolio,/₹220/);assert.match(portfolio,/₹20/);assert.match(portfolio,/100.0%/);
  assert.match(await ask("Explain RSI and P\/E"),/Relative Strength Index/);
  assert.match(await ask("What do FII and DII mean?"),/domestic institutional/);
  assert.match(await ask("What is market cap?"),/outstanding shares/);
  const general=await ask("How do I read the opening auction?");
  assert.match(general,/opening auction/);assert.doesNotMatch(general,/Priced holdings value/);
});

test("stock fallback survives offline quotes and ticker detection avoids substrings", async () => {
  let calls=0;
  const {POST}=loader({
    "lib/gemini.ts":{...load("lib/gemini.ts"),getGenAI:()=>null},
    "lib/portfolio-data.ts":{enrichHoldings:async h=>h},
    "lib/market-data.ts":{getQuotes:async()=>{calls++;throw new Error("offline");}},
  })("app/api/chat/route.ts");
  const ask=async query=>(await (await POST(new Request("http://local",{method:"POST",body:JSON.stringify({query,portfolio:[]})}))).json()).content;
  assert.match(await ask("Compare TCS and INFY"),/TCS[\s\S]*Unavailable[\s\S]*INFY/);
  assert.equal(calls,1);
  assert.match(await ask("What is relianceful?"),/Your question/);assert.equal(calls,1);
});

test("chat retries a missing streaming model before tokens but never after partial output", async () => {
  for(const partial of [false,true]) {
    const models=[];
    const {POST}=loader({
      "lib/gemini.ts":{...load("lib/gemini.ts"),DEFAULT_GEMINI_MODEL:"missing",getGenAI:()=>({models:{generateContentStream:async function*({model}){
        models.push(model);
        if(model==="missing"){if(partial)yield {text:"Partial"};throw Object.assign(new Error("missing"),{status:404});}
        yield {text:"Recovered AI answer"};
      }}})},
      "lib/portfolio-data.ts":{enrichHoldings:async h=>h},
    })("app/api/chat/route.ts");
    const response=await POST(new Request("http://local",{method:"POST",body:JSON.stringify({query:"Explain RSI",portfolio:[],stream:true})}));
    const events=[];await readChatStream(response,e=>events.push(e));
    assert.equal(models.length,partial?1:2);
    if(partial)assert.match(events.find(e=>e.type==="fallback").content,/Relative Strength Index/);
    else assert.equal(events.filter(e=>e.type==="delta").map(e=>e.text).join(""),"Recovered AI answer");
  }
});

test("five video templates produce distinct factual scripts with real data and missing feeds", () => {
  const {normalizeVideoProps,measuredScript,VIDEO_TEMPLATE_DETAILS}=load("lib/video.ts");
  const props=normalizeVideoProps({benchmarks:[{symbol:"^NSEI",name:"NIFTY 50",price:22000,pct:1},{symbol:"^BSESN",name:"SENSEX",price:72000,pct:-0.5}],movers:{gainers:[{symbol:"TCS",price:2500,pct:2}],losers:[{symbol:"INFY",price:1500,pct:-1}]},sectors:[{name:"Banking",change:-1},{name:"IT",change:2}],coverage:87,universe:100,dateStr:"23 October 2026",sessionStatus:"close",fiiDii:{date:"22 Oct 2026",fiiNet:-100,diiNet:250,asOf:"2026-10-22T13:00:00Z",isStale:true}});
  const ipos={ongoing:[{symbol:"ISSUE",subscription:{total:2.4}}],upcoming:[{symbol:"NEXT",openDate:"27 Oct 2026"}],listed:[{symbol:"LISTED",listingDate:"22 Oct 2026",listingGain:"+24.5%"}],isStale:true,asOf:"2026-10-23T13:00:00Z"};
  const scripts=Object.keys(VIDEO_TEMPLATE_DETAILS).map(id=>measuredScript(id,props,ipos));
  assert.equal(new Set(scripts.map(lines=>lines.join("\n"))).size,5);
  for(const script of scripts){assert.equal(script.length,3);assert.ok(script.every(line=>line.length<=150));}
  assert.match(scripts[0][0],/NIFTY 50[\s\S]*SENSEX/);assert.match(scripts[0][2],/closed/);
  assert.match(scripts[1][0],/-₹100 Cr/);assert.match(scripts[1][2],/\+₹150 Cr[\s\S]*22 Oct 2026[\s\S]*Stale/);
  assert.match(scripts[2][0],/IT/);assert.match(scripts[2][1],/Banking/);assert.match(scripts[2][2],/3.00 percentage/);
  assert.match(scripts[3][0],/2.40x/);assert.match(scripts[3][1],/\+24.5%/);assert.match(scripts[3][2],/27 Oct 2026/);assert.doesNotMatch(scripts[3].join(" "),/filed with SEBI/);
  assert.match(scripts[4][0],/TCS/);assert.match(scripts[4][1],/INFY/);assert.match(scripts[4][2],/87\/100/);
  assert.equal(new Set(Object.keys(VIDEO_TEMPLATE_DETAILS).map(id=>measuredScript(id,normalizeVideoProps({})).join("\n"))).size,5);
});

test("video route carries template-specific titles, wraps, counts and IPO inputs through fallback", async () => {
  const {POST}=loader({
    "lib/gemini.ts":{...load("lib/gemini.ts"),getGenAI:()=>null},
    "lib/market-data.ts":{getQuotes:async()=>[],getMovers:async()=>({gainers:[],losers:[],coverage:77,universe:100}),getSectors:async()=>[]},
    "lib/institutional-flows.ts":{getInstitutionalFlows:async()=>null},
    "lib/ipo-feed.ts":{getIpos:async()=>({ongoing:[{symbol:"BID",subscription:{total:3}}],upcoming:[],listed:[],isStale:true,asOf:"2026-10-23T10:00:00Z"})},
  })("app/api/video/route.ts");
  const results=[];
  for(const templateId of ["daily-wrap","fii-dii","sector-rotation","ipo-tracker","top-movers"]){
    results.push(await (await POST(new Request("http://local",{method:"POST",body:JSON.stringify({templateId})}))).json());
  }
  for(const field of ["title","wrap"])assert.equal(new Set(results.map(result=>result[field])).size,5);
  assert.equal(new Set(results.map(result=>result.script.join("\n"))).size,5);
  assert.match(results[3].script[0],/BID: 3.00x/);assert.match(results[3].script[2],/Cached/);
  assert.match(results[4].script[2],/77\/100/);
});

test("health route is dynamic, uncached and reports the current process", async () => {
  const health = load("app/api/health/route.ts");
  assert.equal(health.runtime, "nodejs");
  assert.equal(health.dynamic, "force-dynamic");
  const before = Date.now();
  const response = health.GET();
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(data.status, "ok");
  assert.ok(Date.parse(data.timestamp) >= before && Date.parse(data.timestamp) <= Date.now());
  assert.ok(Number.isFinite(data.uptime) && data.uptime >= 0 && data.uptime <= process.uptime());
  assert.deepEqual(Object.keys(data).sort(), ["status", "timestamp", "uptime"]);
});

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
    "lib/gemini.ts": { ...load("lib/gemini.ts"), getGenAI: () => ({ models: { generateContentStream: async function* () {
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
  const fixtureLoader = loader({ "lib/portfolio-data.ts": { enrichHoldings: async () => { throw new Error("offline"); } }, "lib/gemini.ts": { ...load("lib/gemini.ts"), getGenAI: () => null } });
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
    "lib/gemini.ts": { ...load("lib/gemini.ts"), getGenAI: () => ({ models: { generateContentStream: async function* () {
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

test("institutional parsing pairs dates, recomputes net flows, and rejects incomplete records", () => {
  const { parseFlows, mergeFlows, flowsTtl } = load("lib/institutional-flows.ts");
  const asOf = "2026-10-23T04:00:00Z";
  const values = parseFlows([
    { date: "22-Oct-2026", category: "FII/FPI", buyValue: "13,627.54", sellValue: "17086.24", netValue: "999" },
    { date: "22-Oct-2026", category: "DII", buyValue: "16242.83", sellValue: "13351.51" },
    { date: "21-Oct-2026", category: "DII", buyValue: "bad", sellValue: "100" },
    { date: "20-Oct-2026", category: "FII/FPI", buyValue: "200", sellValue: "100" },
  ], asOf);
  assert.equal(values.length, 1);
  assert.equal(values[0].fiiNet, -3458.70);
  assert.equal(values[0].diiNet, 2891.32);
  assert.ok(Math.abs(values[0].fiiNet - (values[0].fiiBuy-values[0].fiiSell)) < 1e-8);
  assert.equal(values[0].asOf, asOf);
  const history = Array.from({ length: 35 }, (_, index) => ({ ...values[0], date: new Date(Date.UTC(2026,8,index+1)).toDateString() }));
  assert.equal(mergeFlows(history, history).length, 30);
  assert.equal(flowsTtl(new Date("2026-10-23T05:00:00Z")), 2*3600000);
  assert.equal(flowsTtl(new Date("2026-10-23T13:00:00Z")), 12*3600000);
  assert.equal(flowsTtl(new Date("2026-10-23T12:00:00Z")), 30*60000);
});

test("IPO categorization uses IST dates, merges subscriptions, and requires a confirmed listing", () => {
  const { categorizeIpos } = load("lib/ipo-feed.ts");
  const issue = { companyName: "Fixture Limited", symbol: "TEST", series: "EQ", issueStartDate: "21-Oct-2026", issueEndDate: "23-Oct-2026", issuePrice: "Rs.100 to Rs.110", issueSize: "10000" };
  const result = categorizeIpos({
    current: [ { ...issue, category: "Total", noOfTime: "3.5" }, { ...issue, category: "Retail Individual Investors", noOfTime: "2.1" } ],
    upcoming: [{ ...issue, symbol: "NEXT", issueStartDate: "26-Oct-2026", issueEndDate: "28-Oct-2026" }],
    past: [
      { company: "Listed", symbol: "OLD", securityType: "EQ", listingDate: "22-Oct-2026", ipoStartDate: "12-Oct-2026", ipoEndDate: "14-Oct-2026" },
      { company: "Pending", symbol: "PENDING", securityType: "EQ", listingDate: "26-Oct-2026" },
      { company: "Closed only", symbol: "CLOSED", securityType: "EQ", ipoEndDate: "21-Oct-2026" },
      { company: "Bond", symbol: "BOND", securityType: "DEBT", listingDate: "22-Oct-2026" },
    ],
  }, "2026-10-22T19:00:00Z"); // Already 23 Oct in India.
  assert.equal(result.ongoing.length, 1);
  assert.equal(result.upcoming[0].symbol, "NEXT");
  assert.deepEqual(result.listed.map(i => i.symbol), ["OLD"]);
  assert.deepEqual(result.ongoing[0].subscription, { total: 3.5, retail: 2.1 });
  assert.equal(result.ongoing[0].priceBand, "₹100 – ₹110");
  assert.equal(result.ongoing[0].issueSize, "10,000 shares");
  assert.equal(result.listed[0].listingGain, undefined);
  assert.equal(result.ongoing[0].gmp, undefined);
});

test("stale feed cache coalesces, expires, backs off outages, and preserves the original timestamp", async () => {
  const { staleFeedCache } = load("lib/cache.ts");
  let time = 0, calls = 0, offline = false;
  const seed = { asOf: "2026-10-21T12:30:00Z", isStale: true, value: 10 };
  const cached = staleFeedCache(async () => {
    calls++;
    if (offline) throw new Error("blocked");
    return { asOf: "2026-10-22T12:30:00Z", isStale: false, value: 20 };
  }, seed, () => 100, () => time);
  const [first, concurrent] = await Promise.all([cached(), cached()]);
  assert.deepEqual(first, concurrent); assert.equal(calls, 1);
  time = 99; assert.equal((await cached()).isStale, false); assert.equal(calls, 1);
  time = 100; offline = true;
  const stale = await cached();
  assert.equal(calls, 2); assert.equal(stale.isStale, true); assert.equal(stale.asOf, first.asOf); assert.equal(stale.value, 20);
  time++; await cached(); assert.equal(calls, 2);
  time += 5*60000; offline = false;
  assert.equal((await cached()).isStale, false); assert.equal(calls, 3);
  const cold = staleFeedCache(async () => { throw new Error("offline"); }, seed, () => 100);
  assert.deepEqual(await cold(), seed);
});

test("feed routes return structured stale snapshots when NSE is unreachable", async () => {
  const offlineLoader = loader({ "lib/nse.ts": { ...load("lib/nse.ts"), nseJson: async () => { throw new Error("NSE blocked"); } } });
  // Skip the secondary HTTP history fetch while exercising the actual route/cache wiring.
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const flowResponse = await offlineLoader("app/api/fii-dii/route.ts").GET();
    const flows = await flowResponse.json();
    assert.equal(flows.isStale, true); assert.ok(flows.history.length >= 10);
    assert.equal(flows.latest.date, flows.history.at(-1).date);
    const ipoResponse = await offlineLoader("app/api/ipo/route.ts").GET();
    const ipos = await ipoResponse.json();
    assert.equal(ipos.isStale, true);
    assert.ok(ipos.asOf); assert.ok(Array.isArray(ipos.ongoing)); assert.ok(Array.isArray(ipos.upcoming)); assert.ok(Array.isArray(ipos.listed));
  } finally { globalThis.fetch = original; }
});

test("NSE transport bootstraps and refreshes session cookies once on a blocked API response", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let apiCalls = 0;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === "https://www.nseindia.com") return new Response("homepage", { headers: { "Set-Cookie": `session=${calls.length}; Path=/; HttpOnly` } });
    apiCalls++;
    return apiCalls === 1 ? new Response("expired", { status: 403 }) : Response.json([{ category: "DII" }]);
  };
  try {
    const { nseJson } = loader()("lib/nse.ts");
    assert.deepEqual(await nseJson("/api/fiidiiTradeReact"), [{ category: "DII" }]);
    assert.equal(calls.length, 4);
    assert.equal(calls[1].options.headers.Cookie, "session=1");
    assert.equal(calls[3].options.headers.Cookie, "session=3");
    assert.equal(calls[1].options.headers.Referer, "https://www.nseindia.com/");
    assert.ok(calls[1].options.headers["Accept-Language"]);
    assert.ok(calls[1].options.signal);
  } finally { globalThis.fetch = original; }
});

test("IPO feed uses historical listing-day prices and caches all three NSE categories", async () => {
  let requests = 0, chartRequests = 0;
  const asOf = new Date().toISOString().slice(0,10);
  const fixtures = {
    "/api/ipo-current-issue": [{ symbol: "OPEN", companyName: "Open issue", series: "EQ", issueStartDate: "2020-01-01", issueEndDate: "2099-01-01", category: "Total", noOfTime: "1.25" }],
    "/api/all-upcoming-issues?category=ipo": [{ symbol: "FUTURE", companyName: "Future issue", series: "EQ", issueStartDate: "2099-01-02", issueEndDate: "2099-01-03" }],
    "/api/public-past-issues": [{ symbol: "LISTED", company: "Listed issue", securityType: "EQ", listingDate: "2020-01-01", issuePrice: "100" }],
  };
  const provider = loader({
    "lib/nse.ts": { ...load("lib/nse.ts"), nseJson: async path => { requests++; return fixtures[path]; } },
    "lib/yahoo.ts": { __esModule: true, default: { chart: async (symbol, query) => {
      chartRequests++; assert.equal(symbol, "LISTED.NS");
      assert.equal(query.period1.toISOString().slice(0,10), "2019-12-31"); // Midnight IST.
      return { quotes: [{ date: new Date("2020-01-01T10:00:00Z"), close: 124.5 }] };
    } } },
  });
  const route = provider("app/api/ipo/route.ts");
  const first = await (await route.GET()).json();
  const second = await (await route.GET()).json();
  assert.equal(first.isStale, false); assert.equal(first.asOf.slice(0,10), asOf);
  assert.equal(first.listed[0].listingGain, "+24.50%");
  assert.equal(first.ongoing[0].subscription.total, 1.25);
  assert.equal(first.upcoming[0].symbol, "FUTURE");
  assert.deepEqual(first, second); assert.equal(requests, 3); assert.equal(chartRequests, 1);
});

test("IPO listings exclude future sessions and legacy re-admissions", () => {
  const { categorizeIpos } = load("lib/ipo-feed.ts");
  const sources = { current: [], upcoming: [], past: [
    { company: "Morning listing", symbol: "TODAY", securityType: "EQ", listingDate: "23-Oct-2026", ipoEndDate: "19-Oct-2026" },
    { company: "Legacy admission", symbol: "LEGACY", securityType: "SME", listingDate: "22-Oct-2026", ipoEndDate: "25-Feb-2021" },
  ] };
  assert.equal(categorizeIpos(sources, "2026-10-23T02:00:00Z").listed.length, 0);
  assert.deepEqual(categorizeIpos(sources, "2026-10-23T05:00:00Z").listed.map(i => i.symbol), ["TODAY"]);
});

test("EMA series has exact warm-up length, numerical seed, and candle timestamp alignment", () => {
  const { calculateEmaSeries } = load("lib/indicators.ts");
  for (const period of [20, 50, 200]) {
    const series = calculateEmaSeries(candles, period);
    assert.equal(series.length, candles.length-period+1);
    assert.equal(series[0].time, candles[period-1].time);
    assert.equal(series.at(-1).time, candles.at(-1).time);
    assert.equal(series[0].value, candles.slice(0,period).reduce((sum,c) => sum+c.close,0)/period);
    assert.ok(series.every((point,index) => point.time === candles[index+period-1].time));
  }
});

test("Bollinger series is aligned, symmetric about SMA, and ordered for varying closes", () => {
  const { calculateBollingerBandsSeries } = load("lib/indicators.ts");
  const series = calculateBollingerBandsSeries(candles);
  assert.equal(series.length, candles.length-19);
  assert.equal(series[0].time, candles[19].time);
  assert.equal(series.at(-1).time, candles.at(-1).time);
  for (const point of series) {
    assert.ok(point.upper > point.middle && point.middle > point.lower);
    assert.ok(Math.abs(point.upper+point.lower-2*point.middle) < 1e-8);
  }
  const flat = calculateBollingerBandsSeries(candles.map(c => ({ ...c, close: 100 })));
  assert.equal(flat[0].upper, 100); assert.equal(flat[0].lower, 100);
});

test("RSI series starts after fourteen changes and remains within 0–100", () => {
  const { calculateRsiSeries } = load("lib/indicators.ts");
  const mixed = candles.map((c,i) => ({ ...c, close: 100+Math.sin(i/3)*20+i/10 }));
  for (const input of [candles, [...candles].map((c,i) => ({ ...c, close: 400-i })), mixed]) {
    const series = calculateRsiSeries(input);
    assert.equal(series.length, input.length-14);
    assert.equal(series[0].time, input[14].time);
    assert.equal(series.at(-1).time, input.at(-1).time);
    assert.ok(series.every(point => Number.isFinite(point.value) && point.value >= 0 && point.value <= 100));
  }
});

test("indicator series tolerate insufficient, empty, invalid, shuffled and duplicate inputs", () => {
  const { calculateEmaSeries, calculateBollingerBandsSeries, calculateRsiSeries } = load("lib/indicators.ts");
  for (const input of [[], candles.slice(0,10)]) {
    assert.deepEqual(calculateEmaSeries(input,20), []);
    assert.deepEqual(calculateBollingerBandsSeries(input), []);
    assert.deepEqual(calculateRsiSeries(input), []);
  }
  assert.deepEqual(calculateRsiSeries(candles.slice(0,14)), []);
  assert.equal(calculateEmaSeries(candles.slice(0,20),20).length, 1);
  assert.equal(calculateBollingerBandsSeries(candles.slice(0,20)).length, 1);
  for (const period of [0,-1,1.5,NaN,Infinity]) {
    assert.deepEqual(calculateEmaSeries(candles,period), []);
    assert.deepEqual(calculateBollingerBandsSeries(candles,period), []);
    assert.deepEqual(calculateRsiSeries(candles,period), []);
  }
  const scrambled = [...candles].reverse().concat(candles[0], { ...candles[0], close: NaN });
  assert.deepEqual(calculateEmaSeries(scrambled,20), calculateEmaSeries(candles,20));
});

test("chart overlays use warm-up bars and only expose points in the visible candle range", async () => {
  const fixtureLoader = loader({ "lib/yahoo.ts": { __esModule:true, default:{ chart: async () => ({ quotes: candles.map(c => ({ ...c, date:new Date(c.time*1000) })) }) } } });
  const result = await fixtureLoader("lib/chart-data.ts").getChartData("TEST.NS", "1M");
  assert.ok(result.candles.length < 50);
  assert.equal(result.indicatorSeries.ema200.length, result.candles.length);
  for (const series of Object.values(result.indicatorSeries)) {
    assert.equal(series[0].time, result.candles[0].time);
    assert.equal(series.at(-1).time, result.candles.at(-1).time);
  }
});

test("market video is exactly 45 seconds and scene boundaries cover every frame once", () => {
  const { VIDEO, VIDEO_SCENES, sceneAtFrame } = load("lib/video.ts");
  assert.equal(VIDEO.durationInFrames,1350); assert.equal(VIDEO.durationInFrames/VIDEO.fps,45);
  assert.deepEqual(VIDEO_SCENES.map(scene=>[scene.from,scene.from+scene.duration]),[[0,240],[240,600],[600,960],[960,1350]]);
  for(let frame=0;frame<1350;frame++) assert.equal(VIDEO_SCENES.filter(scene=>frame>=scene.from && frame<scene.from+scene.duration).length,1);
  assert.equal(sceneAtFrame(239).id,"headline");assert.equal(sceneAtFrame(240).id,"movers");
  assert.equal(sceneAtFrame(600).id,"sectors");assert.equal(sceneAtFrame(960).id,"script");
  assert.equal(sceneAtFrame(-1),null);assert.equal(sceneAtFrame(1350),null);
});

test("video input normalization bounds payloads and preserves missing values without fictional rows", () => {
  const { normalizeVideoProps } = load("lib/video.ts");
  const empty=normalizeVideoProps(null);
  assert.deepEqual(empty.movers,{gainers:[],losers:[]});assert.deepEqual(empty.sectors,[]);assert.equal(empty.fiiDii,null);
  const input={
    title:"x".repeat(200),benchmarks:[{symbol:"^NSEI",name:"NIFTY 50",price:NaN,change:null,pct:null}],
    movers:{gainers:[{symbol:"TCS",price:2500,pct:2},{symbol:"BAD",price:NaN,pct:4},{symbol:"DOWN",price:2,pct:-1}],losers:[{symbol:"INFY",price:1500,pct:-2}]},
    sectors:[{name:"IT",change:2},{name:"Banking",change:1},{name:"Missing",change:null}],
    fiiDii:{date:"22 Oct 2026",fiiNet:-100,diiNet:200,asOf:"2026-10-22T13:00:00Z",isStale:true},
    scriptLines:Array(9).fill("x".repeat(200)),scriptSource:"ai",capturedAt:"invalid",
  };
  const result=normalizeVideoProps(input);
  assert.equal(result.title.length,72);assert.equal(result.benchmarks[0].price,null);
  assert.equal(result.movers.gainers.length,1);assert.equal(result.movers.losers.length,1);
  assert.deepEqual(result.sectors.map(row=>row.name),["IT","Banking"]);
  assert.equal(result.fiiDii.isStale,true);assert.equal(result.fiiDii.fiiNet,-100);
  assert.equal(result.scriptLines.length,5);assert.equal(result.scriptLines[0].length,150);
  assert.equal(result.capturedAt,"");assert.equal(result.sessionStatus,"latest");
  assert.equal(input.scriptLines.length,9);
});

test("live video adapter reads Indian formatted values and uses provider session dates", () => {
  const { videoFromFeeds, videoFilename }=load("lib/video.ts");
  const props=videoFromFeeds({quotes:[{symbol:"^NSEI",name:"NIFTY 50",price:"22,687.65",change:"-123.45",pct:"-0.54%",asOf:"2026-10-22T10:00:00Z"}],movers:{gainers:[{stock:"TCS",val:"₹2,500.50",change:"+2.25%"}],losers:[]},sectors:[],flows:null,capturedAt:"2026-10-22T23:30:00Z"});
  assert.equal(props.benchmarks[0].price,22687.65);assert.equal(props.benchmarks[0].change,-123.45);
  assert.equal(props.movers.gainers[0].pct,2.25);assert.match(props.dateStr,/22/);
  assert.equal(videoFilename(props,"mp4"),"etnow-market-wrap-2026-10-23.mp4");
  assert.equal(props.scriptSource,"awaiting");assert.deepEqual(props.scriptLines,[]);
});

test("video API freezes real inputs and returns labelled factual fallback when AI is unavailable", async () => {
  const routeLoader=loader({
    "lib/gemini.ts":{...load("lib/gemini.ts"),getGenAI:()=>null},
    "lib/market-data.ts":{
      getQuotes:async()=>[{symbol:"^NSEI",regularMarketPrice:22000,regularMarketChange:100,regularMarketChangePercent:0.5,regularMarketTime:new Date("2026-10-22T10:00:00Z"),marketState:"CLOSED"}],
      getMovers:async()=>({gainers:[{stock:"TCS",val:"₹2,500",change:"+2.00%"}],losers:[]}),
      getSectors:async()=>[{name:"IT",change:1.25}],
    },
    "lib/institutional-flows.ts":{getInstitutionalFlows:async()=>{throw new Error("offline");}},
    "lib/ipo-feed.ts":{getIpos:async()=>null},
  });
  const {POST}=routeLoader("app/api/video/route.ts");
  const response=await POST(new Request("http://local/api/video",{method:"POST",body:JSON.stringify({templateId:"daily-wrap"})}));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.videoProps.scriptSource,"measured-data");assert.equal(result.videoProps.sessionStatus,"close");
  assert.equal(result.videoProps.fiiDii,null);assert.equal(result.script.length,3);
  assert.match(result.script[0],/22,000/);assert.match(result.script[1],/TCS/);
  assert.deepEqual(result.script,result.videoProps.scriptLines);
  assert.equal((await POST(new Request("http://local",{method:"POST",body:"{}"}))).status,400);
});

test("video encoder selects a supported container and forwards all 1350 frames with real progress", async () => {
  const originalDocument=globalThis.document;
  globalThis.document={fonts:{ready:Promise.resolve(),load:async()=>[]}};
  let captured;
  const exporter=loader({
    "components/video/MarketComposition.ts":{MarketVideoComposition:()=>null},
    "@remotion/web-renderer":{
      canRenderMediaOnWeb:async options=>({canRender:options.container==="webm"}),
      renderMediaOnWeb:async options=>{captured=options;options.onProgress({progress:.425});return {getBlob:async()=>new Blob(["encoder-fixture"],{type:"video/webm"})};},
    },
  })("lib/video-export.ts");
  try {
    const events=[],props=load("lib/video.ts").normalizeVideoProps({capturedAt:"2026-10-22T12:30:00Z"});
    const output=await exporter.exportMarketVideo(props,new AbortController().signal,value=>events.push(value));
    assert.equal(captured.composition.durationInFrames,1350);assert.equal(captured.composition.fps,30);
    assert.equal(captured.composition.width,1920);assert.equal(captured.composition.height,1080);
    assert.equal(output.format,"webm");assert.match(output.filename,/\.webm$/);
    assert.deepEqual(events,[42,100]);assert.ok(output.blob.size>0);
    const controller=new AbortController();controller.abort();
    await assert.rejects(exporter.exportMarketVideo(props,controller.signal,()=>{}),{name:"AbortError"});
  } finally {globalThis.document=originalDocument;}
});

test("successful video AI output is attached to the same market snapshot", async () => {
  let prompt="";
  const aiLoader=loader({
    "lib/gemini.ts":{...load("lib/gemini.ts"),getGenAI:()=>({models:{generateContent:async request=>{prompt=request.contents;return {text:JSON.stringify({title:"Measured market update",wrap:"A factual session summary.",script:["Benchmark data is unavailable.","No equity movers were supplied.","Sector quotes are unavailable."]})};}}})},
    "lib/market-data.ts":{getQuotes:async()=>[],getMovers:async()=>({gainers:[],losers:[]}),getSectors:async()=>[]},
    "lib/institutional-flows.ts":{getInstitutionalFlows:async()=>({latest:{date:"22 Oct 2026",fiiNet:-10,diiNet:20,asOf:"2026-10-22T13:00:00Z"},isStale:true})},
    "lib/ipo-feed.ts":{getIpos:async()=>null},
  });
  const response=await aiLoader("app/api/video/route.ts").POST(new Request("http://local/api/video",{method:"POST",body:JSON.stringify({templateId:"fii-dii"})}));
  const data=await response.json();
  assert.equal(data.videoProps.scriptSource,"ai");assert.equal(data.videoProps.fiiDii.isStale,true);
  assert.deepEqual(data.script,data.videoProps.scriptLines);assert.equal(data.title,data.videoProps.title);
  assert.match(prompt,/Do not invent news/);assert.match(prompt,/22 Oct 2026/);
});
