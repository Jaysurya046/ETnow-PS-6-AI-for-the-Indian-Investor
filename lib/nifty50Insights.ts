export interface StockInsights {
  technical: string[];
  quantitative: string[];
}

export const NIFTY50_INSIGHTS: Record<string, StockInsights> = {
  RELIANCE: {
    technical: ["Trading above 50DMA & 200DMA — strong bullish structure confirmed", "RSI at 62 with bullish MACD crossover — momentum favours upside", "Key support at ₹2,760; resistance at ₹2,920 (14-week cup rim)"],
    quantitative: ["P/E 27.8 vs sector avg 18.5 — premium justified by Jio + Retail growth", "FII holding up 1.2% QoQ — institutional confidence rising", "52W range position: 78% — trading in upper quartile"],
  },
  TCS: {
    technical: ["Respecting ascending channel since Dec lows — each dip bought at lower rail", "MACD histogram turning positive after 3-week consolidation", "Volume declining in pullback — healthy correction, not distribution"],
    quantitative: ["P/E 32.1 vs IT sector avg 28.4 — slight premium for quality leadership", "Dividend yield 1.3% — consistent payout history over 15 years", "Revenue growth 8.2% YoY — steady but not accelerating"],
  },
  HDFCBANK: {
    technical: ["Double bottom at ₹1,480 with declining volume on 2nd test — selling exhaustion", "Price reclaiming 20DMA after 6 weeks below it — momentum shift", "MACD about to cross zero line from below — bullish signal pending"],
    quantitative: ["P/E 18.9 — cheapest among top-3 private banks historically", "NIM stable at 3.6% — margin compression fears overdone", "Advances growth 19.4% YoY — above industry average of 15.8%"],
  },
  ICICIBANK: {
    technical: ["Bull flag forming after +16% impulsive rally — textbook continuation", "RSI cooling from 72 to 58 during flag — healthy reset without breakdown", "50DMA acting as dynamic support within the flag channel"],
    quantitative: ["ROE 17.8% — highest among large private banks", "P/BV 3.2 vs 5-year avg 3.8 — trading below historical mean", "Gross NPA down to 2.16% — asset quality improving for 8th straight quarter"],
  },
  INFY: {
    technical: ["Broke 16-month resistance at ₹1,780 — now retesting as support", "Volume on breakout day was 2.4× average — strong conviction", "20DMA crossed above 50DMA (golden cross) 3 weeks ago"],
    quantitative: ["P/E 28.6 — in line with IT sector; $2.1B TCV adds visibility", "Free cash flow yield 3.4% — among highest in Indian IT", "Attrition dropped to 12.4% — margin tailwind from lower hiring costs"],
  },
  ITC: {
    technical: ["Hammer candle at ₹410 support — 4th successful bounce from this level", "RSI at 38 recovering from oversold — early reversal signal", "200DMA at ₹440 — acting as near-term resistance ceiling"],
    quantitative: ["P/E 24.2 — FMCG discount vs HUL (58x) and Nestle (72x)", "Dividend yield 3.1% — highest among FMCG large-caps", "Cigarette volume growth +4.8% — resilient core business"],
  },
  SBIN: {
    technical: ["Coiling inside symmetrical triangle — Bollinger bandwidth at 6-month low", "Prior trend was up — triangle breakout likely follows upward direction", "Volume declining steadily inside triangle — compression building"],
    quantitative: ["P/BV 1.6 — cheapest PSU bank vs private peers at 3-4x", "ROA 1.1% — best-in-class for a PSU bank of this size", "Net NPA 0.64% — historic low; asset quality transformation story"],
  },
  BHARTIARTL: {
    technical: ["Trading at all-time highs — no overhead supply or resistance", "RSI 67 — strong but not overbought; room for extension", "Every 5-8% dip in last 12 months has been aggressively bought"],
    quantitative: ["ARPU ₹211 — rising steadily with tariff hike tailwinds", "Net debt/EBITDA 2.1x — deleveraging faster than expected", "Africa subscriber base crossed 150M — diversification value emerging"],
  },
  LT: {
    technical: ["Ascending triangle with flat resistance at ₹3,680 — 4 rising lows since Jan", "Volume pattern shows accumulation — higher volume on up days", "50DMA slope steepest in 18 months — strong trend momentum"],
    quantitative: ["Order book at ₹4.8L Cr — record high providing 3-year revenue visibility", "P/E 33.2 — premium to engineering peers; justified by execution", "Budget infra allocation +11% — structural capex tailwind intact"],
  },
  BAJFINANCE: {
    technical: ["Bullish engulfing at 200DMA — historically strongest reversal zone", "RSI bouncing from 35 oversold territory — demand zone activated", "MACD bearish momentum fading — histogram bars shrinking"],
    quantitative: ["AUM growth 32% YoY — industry-leading among large NBFCs", "P/E 36 — corrected from 60+; more reasonable entry valuation", "Customer additions 3.6M/quarter — market penetration accelerating"],
  },
  HCLTECH: {
    technical: ["Breaking above 3-month consolidation box (₹1,480–₹1,680)", "Volume expansion on breakout — institutional buying confirmed", "20DMA crossing 50DMA — bullish golden cross forming"],
    quantitative: ["P/E 24.8 — cheapest among Tier-1 IT; value re-rating candidate", "Services revenue mix improving — 68% recurring revenue base", "Deal pipeline $12.4B — strong order intake supporting growth visibility"],
  },
  ASIANPAINT: {
    technical: ["Classic H&S pattern — left shoulder ₹3,200, head ₹3,480, right shoulder ₹3,180", "Neckline at ₹2,980 — critical support level to watch", "Volume higher on right shoulder decline — distribution confirmed"],
    quantitative: ["P/E 62.4 — expensive vs sector avg 45; premium eroding", "Volume growth slowing to +3.2% — demand moderation visible", "Margin pressure from crude-linked raw materials — 120bps EBITDA compression"],
  },
  MARUTI: {
    technical: ["Retesting breakout above 2-year ceiling at ₹12,500 — prior resistance is now support", "RSI stable at 56 — neutral zone; not overbought post breakout", "Weekly chart shows strong uptrend with higher highs and higher lows"],
    quantitative: ["P/E 30.5 — slight premium; justified by market share gains", "Rural sales mix improving to 42% — recovery cycle beneficiary", "EV + hybrid pipeline adds long-term re-rating optionality"],
  },
  AXISBANK: {
    technical: ["Falling wedge breakout with volume expansion — high-probability reversal", "RSI recovering from 38 to 52 — momentum turning positive", "Price reclaiming 50DMA — first time in 12 weeks"],
    quantitative: ["P/BV 2.3 — discount to ICICI (3.2) and HDFC (3.0)", "Retail loan book growing 22% — granular asset quality improvement", "ROE trending up to 16.5% — approaching Tier-1 private bank levels"],
  },
  SUNPHARMA: {
    technical: ["28-week cup & handle on weekly — one of the clearest patterns in Nifty", "Handle volume 40% below cup volume — textbook low-volume consolidation", "Weekly RSI at 58 — bullish but far from overbought"],
    quantitative: ["P/E 35.2 — in line with pharma large-cap peers", "Specialty portfolio growing at 28% — driving margin expansion", "US FDA pipeline clear — no outstanding warning letters"],
  },
  KOTAKBANK: {
    technical: ["Bearish RSI divergence at ₹1,850 resistance — price higher but RSI lower", "MACD bearish crossover confirmed — momentum weakening", "Support at ₹1,700 (50DMA) — key level to watch for breakdown"],
    quantitative: ["P/BV 3.8 — priciest private bank; premium compression risk", "CASA ratio 52% — declining from 56% — funding cost pressure", "Deposit growth lagging loan growth — structural concern emerging"],
  },
  DMART: {
    technical: ["3 consecutive weekly inside bars — extreme coil at ₹4,600-₹4,850 range", "Bollinger bandwidth at 2-year low — violent breakout imminent", "No directional bias — equal probability either direction"],
    quantitative: ["P/E 88.5 — richly valued even for quality retail franchise", "Same-store sales growth +8.2% — steady but not accelerating", "E-commerce threat from Blinkit/Zepto yet to materially impact footfall"],
  },
  TITAN: {
    technical: ["Cleared prior ATH at ₹3,840 on volume — clean breakout into blue sky", "No resistance above — momentum-driven extension likely", "RSI at 68 — approaching overbought but trend is strong"],
    quantitative: ["P/E 72.1 — rich but consistent premium for this brand franchise", "Jewellery segment growing 23% — wedding season + premiumisation", "Tanishq market share expanding from 6% to 8% — structural winner"],
  },
  ULTRACEMCO: {
    technical: ["Strong bull flag after +22% pole — flag holding above 50DMA", "Volume dried up in flag — typical of continuation patterns", "Weekly MACD strongly bullish — no sign of trend exhaustion"],
    quantitative: ["P/E 34.8 — premium to cement peers; capacity leadership valued", "Capacity utilisation 80%+ — pricing power improving", "Budget infra push = structural demand driver for cement sector"],
  },
  BAJAJFINSV: {
    technical: ["Inverse H&S with neckline at ₹1,680 — right shoulder lighter volume (bullish)", "RSI at 52 — neutral territory; room for breakout run", "20DMA flattening after decline — base building phase"],
    quantitative: ["Sum-of-parts valuation suggests 15-20% upside from current levels", "Insurance subsidiary growing embedded value at 18% CAGR", "Bajaj Finance + Allianz synergies adding incremental value"],
  },
  TATAMOTORS: {
    technical: ["20-week rounding bottom — gradual accumulation; not a sharp reversal", "Volume increasing on up-moves — smart money building positions", "Price above both 50DMA and 200DMA — bullish alignment"],
    quantitative: ["P/E 8.2 — deep cyclical discount; recovery priced conservatively", "JLR EBIT margin expanding to 8.5% — recovery thesis gaining traction", "EV market share 72% in India — dominant position in emerging segment"],
  },
  NTPC: {
    technical: ["4th bounce from rising channel lower rail — reliable dynamic support", "RSI at 45 — mid-zone; bounce aligns with historical channel pattern", "Weekly chart shows consistent higher lows since 2023"],
    quantitative: ["P/E 14.8 — value segment; energy peers trade at 12-18x range", "Dividend yield 3.8% — steady income cushion for downside protection", "RE capacity target 60GW by 2032 — transformation story underway"],
  },
  ONGC: {
    technical: ["Breaking above 8-month flat base at ₹310 — significant supply absorption", "Volume 1.8× average on breakout day — institutional participation confirmed", "RSI breakout above 60 — momentum confirming price breakout"],
    quantitative: ["P/E 7.2 — cheapest energy large-cap on NSE", "Dividend yield 4.8% — attractive income floor for value investors", "Budget capex allocation +40% for upstream — structural catalyst"],
  },
  TATASTEEL: {
    technical: ["Descending wedge breakout — one of the highest reliability reversal setups", "Volume surged 2.3× on breakout day — strong conviction", "Price reclaimed 200DMA — first time in 5 months"],
    quantitative: ["P/E 10.4 — below historical average of 14x; cyclical undervaluation", "European operations turning FCF-positive — drag reducing", "India steel demand growing 12% — infrastructure-driven supercycle"],
  },
  POWERGRID: {
    technical: ["Hammer candle at 52W low zone — strong rejection of lower levels", "RSI at 32 — deeply oversold; mean-reversion probability high", "Dividend yield zone historically attracts institutional buyers"],
    quantitative: ["P/E 11.2 — utility value stock trading at historical mean", "Dividend yield 5.4% — among highest in Nifty 50 universe", "Capex pipeline ₹26,000 Cr — regulated return model ensures visibility"],
  },
  NESTLEIND: {
    technical: ["Rising wedge pattern — bearish divergence on RSI (lower highs)", "Price making higher highs but momentum weakening — caution warranted", "Support at ₹2,380 (wedge lower boundary) — key level to hold"],
    quantitative: ["P/E 72.3 — among most expensive FMCG stocks globally", "Volume growth +3.4% — slowing; Maggi saturation concerns", "Urban FMCG slowdown impacting premium portfolio — margin risk"],
  },
  ADANIENT: {
    technical: ["Bollinger Band squeeze — bandwidth at historic low; big move imminent", "No directional bias from technicals — event-driven stock", "₹2,880 support and ₹3,400 resistance define the battleground"],
    quantitative: ["P/E 48.6 — conglomerate discount/premium debate ongoing", "Diverse revenue streams: airports, mining, green energy, commodities", "Debt-to-equity 1.4x — elevated but improving trajectory"],
  },
  ADANIPORTS: {
    technical: ["Weekly ascending triangle — flat top at ₹1,420 with 5 rising lows", "Volume pattern bullish — higher on up-weeks vs down-weeks", "RSI at 58 — constructive positioning for a breakout attempt"],
    quantitative: ["P/E 26.8 — reasonable for India's largest private port operator", "Cargo volume growing 11% YoY — market share gains continuing", "Mundra port utilisation at 75% — capacity for further growth"],
  },
  JSWSTEEL: {
    technical: ["Morning star reversal at multi-month support — 3-candle high-confidence signal", "Volume 2× average on third (bullish) candle — confirmed", "20DMA turning upward — first bullish slope change in 8 weeks"],
    quantitative: ["P/E 14.2 — discount to Tata Steel; catching up on capacity additions", "EBITDA/ton improving to ₹11,200 — operational efficiency gains", "Coking coal prices easing — input cost tailwind for margins"],
  },
  GRASIM: {
    technical: ["Bounced from rising channel midline — 3rd successful midline test", "Weekly RSI at 52 — neutral zone with room to run to channel top", "20DMA and 50DMA converging — potential golden cross setup"],
    quantitative: ["P/E 18.4 — undervalued relative to conglomerate sum-of-parts", "B2B paints launch adds ₹20,000 Cr addressable market", "VSF business stable — cement (via UltraTech) provides valuation floor"],
  },
  WIPRO: {
    technical: ["Double top at ₹560 — RSI making lower highs (bearish divergence)", "Price below both 20DMA and 50DMA — bearish alignment", "Support at ₹490 neckline — breakdown target ₹420"],
    quantitative: ["P/E 22.1 — discount to IT peers; reflects weak execution track record", "Revenue growth 1.2% — lagging peers by 6-7 percentage points", "Large deal wins improving but not yet reflecting in revenue"],
  },
  HINDALCO: {
    technical: ["Broke above 6-month flat top at ₹650 — major supply absorbed", "Volume on breakout 2.1× average — institutional conviction clear", "RSI breakout above 65 — momentum confirming the price breakout"],
    quantitative: ["P/E 11.8 — metals discount; Novelis subsidiary undervalued on SOTP basis", "Global copper prices at 18-month high — revenue tailwind", "Novelis recycling margins expanding — ESG premium emerging"],
  },
  TECHM: {
    technical: ["Descending triangle — lower highs against flat ₹1,240 support", "Each bounce weaker than the last — distribution pattern confirmed", "MACD deeply negative — no sign of bullish reversal yet"],
    quantitative: ["P/E 25.3 — premium for a company with decelerating growth", "Deal wins recovering but average deal size declining — quality concern", "Telecom vertical (30% revenue) facing structural headwinds"],
  },
  SBILIFE: {
    technical: ["Bull flag in strong uptrend — flag holding above 50DMA support", "RSI at 55 — mid-range; room for breakout extension", "Weekly chart shows persistent uptrend with each correction bought"],
    quantitative: ["P/E 68.2 — insurance premium; justified by 20% VNB growth trajectory", "Market share 24.6% — largest private life insurer in India", "Persistency ratio improving to 88% — book quality strengthening"],
  },
  HDFCLIFE: {
    technical: ["Hammer at ₹620 — support tested 5 times successfully; high confidence", "RSI at 42 — oversold territory; bounce probability elevated", "Long lower wick shows aggressive buying at support"],
    quantitative: ["P/E 78.4 — premium justified by 18% embedded value growth CAGR", "HDFC Bank distribution channel adds cross-sell advantage", "Product mix shifting to protection — higher margin segment"],
  },
  DRREDDY: {
    technical: ["Broke 9-month ceiling at ₹5,800 on 2.8× average volume — strong conviction", "Clean USFDA inspection acted as dual technical + fundamental catalyst", "No overhead resistance until ₹6,600 zone — clear runway"],
    quantitative: ["P/E 22.8 — fair value for pharma large-cap with US generics pipeline", "US revenue growing 14% — new product launches adding momentum", "R&D spend at 16% of revenue — pipeline investment sustaining growth"],
  },
  "BAJAJ-AUTO": {
    technical: ["Secular uptrend making consistent ATHs — strongest trend in auto sector", "Every dip to 20-week MA has been bought — reliable entry strategy", "RSI consistently above 55 for 9 months — persistent bullish momentum"],
    quantitative: ["P/E 33.8 — premium for EV 3-wheeler dominance + export recovery", "Export revenue recovering to pre-COVID levels — Africa + LatAm", "EV 3-wheeler market share 70%+ — first-mover advantage monetising"],
  },
  EICHERMOT: {
    technical: ["Ascending triangle just 4% below ATH — high-probability breakout zone", "Volume pattern constructive — higher on rallies, lower on pullbacks", "Weekly RSI at 60 — uptrending but not overbought"],
    quantitative: ["P/E 34.2 — Royal Enfield brand commands lifestyle premium multiples", "Average selling price up 8% YoY — premiumisation working", "International markets growing 25% — diversification reducing India dependence"],
  },
  DIVISLAB: {
    technical: ["RSI touched 28 — multi-year oversold extreme; historically a buy signal", "Price at 38% correction from ATH — entering deep value zone", "200DMA slope starting to flatten — selling pressure easing"],
    quantitative: ["P/E 42.1 — corrected from 80+; approaching reasonable valuation", "Custom synthesis revenue growing 18% — replacing generic API decline", "EBITDA margin holding 30%+ — floor established by specialty portfolio"],
  },
  COALINDIA: {
    technical: ["Breaking above 200DMA for first time in 6 months — momentum shift", "Volume rising on breakout — institutional buying visible", "RSI breakout above 55 — momentum confirming price breakout"],
    quantitative: ["P/E 7.8 — deep value; ~7% dividend yield provides compelling floor", "Coal India production growing 12% — exceeding government targets", "E-auction premium prices adding ₹2,800/ton above notified price"],
  },
  CIPLA: {
    technical: ["Broke out of 5-month channel on 3× average volume — powerful move", "RSI at 64 — bullish but not overbought; continuation probable", "Gap-up breakout — gaps at this volume rarely get filled"],
    quantitative: ["P/E 28.4 — fair value for a pharma major with diversified portfolio", "US generics pipeline with 38 pending ANDAs — revenue runway visible", "Domestic formulations growing 12% — above industry growth rate"],
  },
  TATAPOWER: {
    technical: ["Pennant pattern forming after +28% pole — volume compressed in pennant", "20DMA providing dynamic support within the pennant structure", "RSI at 54 — mid-range; room for breakout extension"],
    quantitative: ["P/E 32.4 — renewable energy premium baked into valuation", "RE capacity 5.2GW — targeting 20GW by 2030; clear growth path", "EV charging network 5,000+ stations — first-mover monopoly building"],
  },
  TATACONSUM: {
    technical: ["Basing at 50-week MA — long-term support holding after 18% correction", "Weekly RSI at 40 — approaching oversold; value entry zone", "Volume declining in correction — not panic selling; orderly pullback"],
    quantitative: ["P/E 54.2 — premium FMCG multiple; justified by Tata brand leverage", "Tea market share 22% — undisputed category leader in India", "Starbucks JV and Sampann brand adding premium revenue streams"],
  },
  BRITANNIA: {
    technical: ["Range-bound ₹4,600–₹5,200 for 4 months — no trend until breakout", "Bollinger Bands contracting — eventual breakout will be sharp", "Equal buying at lows and selling at highs — pure range trade"],
    quantitative: ["P/E 56.8 — FMCG premium but growth not justifying the multiple", "Rural demand recovery slower than expected — headwind to volumes", "Input cost (wheat, palm oil) volatility creating margin uncertainty"],
  },
  APOLLOHOSP: {
    technical: ["Strongest breakout in 18 months from a 6-month base at ₹6,400", "Volume on breakout 2.5x average — institutional conviction confirmed", "No meaningful resistance until ₹7,500 zone — clear technical runway"],
    quantitative: ["P/E 72.6 — premium for healthcare structural growth story", "ARPOB (avg revenue per occupied bed) growing 14% — pricing power", "Digital health platform adding recurring revenue at 25%+ growth"],
  },
  INDUSINDBK: {
    technical: ["Confirmed downtrend — series of lower highs and lower lows", "Each rally to 20DMA is sold aggressively — distribution pattern", "Price below 50DMA and 200DMA — all moving averages bearish"],
    quantitative: ["P/BV 1.4 — cheapest private bank; but cheap for a reason", "Vehicle finance NPAs elevated at 4.2% — sector concentration risk", "Management transition uncertainty weighing on institutional confidence"],
  },
  HEROMOTOCO: {
    technical: ["Flagging at all-time highs — consolidation after +40% rally", "Flag volume 60% below pole volume — textbook continuation setup", "20DMA providing support within the flag — healthy structure"],
    quantitative: ["P/E 25.6 — fair value for 2-wheeler market leader", "Rural 2-wheeler recovery driving 18% volume growth — cyclical upswing", "EV scooter launch Vida expanding to 100 cities — new growth vector"],
  },
  UPL: {
    technical: ["RSI at 22 — multi-year extreme oversold; mean-reversion zone", "Price down 65% from peak — approaching deep value territory", "No bullish technical setup yet — purely a value/speculative play"],
    quantitative: ["P/E 15.2 — significant discount to agrochemical peers (25-30x)", "Debt restructuring underway — balance sheet clean-up in progress", "Global crop protection demand recovering — cyclical trough likely"],
  },
  LTIM: {
    technical: ["Range-bound pre-earnings — waiting for directional catalyst", "50DMA and 200DMA converging — big move expected post-earnings", "Volume below average — market participants waiting on the sidelines"],
    quantitative: ["P/E 30.4 — in line with mid-T1 IT peers like Mphasis and Coforge", "Large deal wins improving — pipeline strongest in 4 quarters", "Mindtree integration synergies adding 150bps to margins — positive"],
  },
  BPCL: {
    technical: ["Breaking above 6-month base with rising volume — bullish breakout", "200DMA just crossed — first bullish crossover in 7 months", "RSI at 56 — early stage momentum; plenty of room to run"],
    quantitative: ["P/E 5.8 — deep value; ~8% dividend yield adds income floor", "Refining margins at $8.2/bbl — above break-even; profitability secured", "Disinvestment candidate — potential government stake sale catalyst"],
  },
};
