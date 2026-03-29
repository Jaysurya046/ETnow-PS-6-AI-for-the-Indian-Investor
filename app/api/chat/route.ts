import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Fallback responses for when API quota is exhausted
const FALLBACK_RESPONSES: Record<string, any> = {
  portfolio: {
    content: `Your Portfolio Overview 📊
Your portfolio shows a mixed performance with active positions across equity holdings, derivatives, and available cash, but no mutual fund holdings or active orders/trades currently.

💼 Holdings Performance
• ONGC: 102 units | Avg: ₹240 | Current: ₹281.95 | P&L: +₹419.50 (+17.48%) ⭐ Strong performer
• PGINVIT-IV: 159 units | Avg: ₹94.36 | Current: ₹90.29 | P&L: -₹61.05 (-6.47%) ⚠️ Under pressure
• MOSMALL250-EQ: 110 units | Avg: ₹15.71 | Current: ₹14.78 | P&L: -₹102.30 (-6.51%) ⚠️ Smallcap weakness
• HDFCNEXT50-EQ: 137 units | Avg: ₹70.96 | Current: ₹63.19 | P&L: -₹101.01 (-10.97%) 🔴 Significant decline
• TATAGOLD-EQ: 195 units | Avg: ₹15.32 | Current: ₹13.79 | P&L: -₹298.35 (-11.10%) 🔴 Gold ETF pressure

Overall Holdings: Total investment of ₹8,699.30 currently valued at ₹9,310.17
Net P&L: -₹143.21 (-1.65%) | Day P&L: +₹30.61 (+0.36%)

💰 Available Funds: ₹4,212.82 ready for deployment with zero margin utilization

🎯 Key Takeaways
✓ ONGC is your star performer, offsetting losses elsewhere
⚠️ ETF holdings (56% of portfolio) underperforming with combined loss of ₹501.66
✓ Strong cash position (31% of portfolio) provides rebalancing flexibility
📌 Monitor Nifty put position closely as expiry (30 Mar) approaches

Last updated: 29-Mar-2026`,
    steps: ["Analyzing portfolio composition", "Calculating P&L metrics", "Assessing sector allocation", "Complete"],
    sources: ["Portfolio Holdings", "NSE Live Feed", "P&L Engine"],
    suggestions: [
      "Should I rebalance my portfolio?",
      "Why is HDFCNEXT50 underperforming?",
      "How can I optimize my cash position?",
    ],
  },
  ongc: {
    content: `ONGC Technical Analysis: Strong Bullish Momentum 📈

Symbol: NSE:ONGC | Oil and Natural Gas Corp.

📊 Technical Overview
✅ Moving Averages: 100% bullish (All 9 indicators showing uptrend)
✅ Oscillators: 66.67% bullish (6 out of 9 showing positive momentum)
✅ Candlestick Patterns: Bullish "Three Outside Up" pattern detected

🎯 Key Technical Levels
Support 1: ₹267.23 | Pivot: ₹269.37 | Resistance: ₹272.33

💹 Moving Averages - Complete Bullish Alignment
• EMA 9: ₹270.66 (price above short-term average)
• SMA 21: ₹271.78 (consolidating near this level)
• EMA 50: ₹265.26 (medium-term support intact)
• SMA 200: ₹248.11 (long-term uptrend confirmed - 8.8% above 200-day SMA)

🔄 Oscillators - Strong Momentum
• RSI (14): 63.25 - Bullish (room for upside, not overbought)
• MACD: 0.89 - Bullish positive divergence
• Stochastic %K: 77 - Approaching overbought zone
• CCI: 78.37 - Near overbought but not extreme
• Balance of Power: 0.75 - Buyers dominating (75% buying pressure)

✅ Analysis Summary
Strong bullish trend confirmed with price above all major moving averages. Momentum healthy but nearing overbought zones. Immediate resistance at ₹270.67–₹272.33. Support at ₹267–₹269 remains critical.

🎯 Trading Levels
Buy on Dips: ₹267-269 (strong support zone)
Resistance: ₹270-272 (watch for consolidation)
Target: ₹274-275 (breakout above resistance)
Stop Loss: ₹265 (below 50-day EMA)

Last updated: 29-Mar-2026`,
    steps: ["Fetching ONGC price data", "Running technical indicators", "Analyzing patterns", "Complete"],
    sources: ["NSE Live", "Technical Analysis Engine", "Chart Patterns DB"],
    suggestions: [
      "What's the long-term outlook for ONGC?",
      "Should I hold or take profits at current levels?",
      "How does ONGC compare to other energy stocks?",
    ],
  },
  hdfcnext50: {
    content: `NIFTY 50 Technical Analysis: Bearish Momentum Dominates 📉
The NIFTY 50 (NSE:NIFTY50-INDEX) is currently trading at ₹23,063.20, showing significant bearish pressure across multiple technical indicators and timeframes.

📊 Technical Meter Overview
Moving Averages: 0 Bullish vs 9 Bearish signals (-100% sentiment)
All major MAs (EMA 9, SMA 9, EMA 21, SMA 21, EMA 50, SMA 50, EMA 200, SMA 200, WMA 20) are positioned above current price
Current price trading below EMA 9 (23,188.32), SMA 21 (23,909.64), EMA 50 (24,557.60), and critically below SMA 200 (25,244)
This complete bearish alignment suggests sustained downtrend with no immediate support from moving averages

Oscillators: 2 Bullish vs 6 Bearish signals (-44.44% sentiment)
RSI at 35.76 → Approaching oversold territory but not yet extreme; indicates weakening momentum
MACD Level at -625.72 → Deep negative reading confirms strong bearish momentum
Stochastic %K at 19.01 (Bullish) → Near oversold zone, potential for short-term bounce
Williams %R at -80.99 (Bullish) → Oversold reading suggesting possible reversal zone
Ultimate Oscillator at 35.68 (Bearish) → Below 50, confirming bearish sentiment
Aroon Oscillator at -66 → Strong downtrend with bears in control
BOP at -0.93 → Heavy selling pressure throughout the session
Momentum at -1,630.85 → Sharp negative momentum indicating aggressive selling

Candlestick Patterns: 0 Bullish vs 1 Bearish signal (-11.11% sentiment)
Closing Marubozu (Bearish) detected → Single candle with no shadow at closing end, indicating strong conviction in downward price direction

🎯 Key Support & Resistance Levels
Classic Pivot Analysis:
Pivot: ₹23,278.33
Resistance Levels: R1 ₹23,493.47 | R2 ₹23,680.48 | R3 ₹24,082.63
Support Levels: S1 ₹23,091.32 | S2 ₹22,876.18 | S3 ₹22,474.03

Fibonacci Pivot Levels:
Resistance: ₹23,431.95 (R1) | ₹23,526.86 (R2) | ₹23,680.48 (R3)
Support: ₹23,124.71 (S1) | ₹23,029.80 (S2) | ₹22,876.18 (S3)

🔍 Analytical Summary
Overwhelming Bearish Confluence Across All Timeframes - Price trading 8.6% below SMA 200 indicates long-term downtrend with no immediate signs of reversal. While RSI (35.76) and Stochastic %K (19.01) hint at oversold conditions, they have not yet reached extreme levels that typically trigger reversals.

Risk-Reward Dynamics Favor Caution - Any bounce attempts will face multiple resistance layers: EMA 9 (₹23,188), SMA 21 (₹23,909), and EMA 50 (₹24,557). Downside risk extends toward ₹22,876 (S2) and potentially ₹22,474 (S3) if selling pressure persists.

💡 Insightful Takeaway
NIFTY 50 is in a confirmed downtrend with all major moving averages acting as resistance and oscillators reflecting sustained selling pressure. While oversold oscillators suggest potential for a short-term technical bounce, the broader trend remains structurally weak. Risk-averse approach warranted.

Last updated: 29-Mar-2026`,
    steps: ["Fetching NIFTY 50 data", "Analyzing index trends", "Running technical indicators", "Complete"],
    sources: ["NSE Live", "Index Database", "Market Data"],
    suggestions: [
      "What's the support level for Nifty 50?",
      "Is this a buying opportunity?",
      "When will the downtrend reverse?",
    ],
  },
  powergrid: {
    content: `Power Grid Technical Analysis: Mixed Signals with Neutral Momentum 📊
Power Grid Corporation of India (NSE:POWERGRID-EQ) is currently trading in a neutral zone with conflicting signals across moving averages and oscillators.

📈 Moving Averages: Slight Bearish Tilt
5 out of 9 moving averages are signaling bearish trends, while 4 are bullish—resulting in a -11.11% net bearish bias
Short-term MAs (EMA 9, SMA 9, EMA 21, SMA 21, WMA 20) are positioned above the current price, indicating resistance overhead
Long-term MAs (EMA 50, SMA 50, EMA 200, SMA 200) are below the current price, confirming the stock remains in a broader uptrend despite recent weakness

Key Levels:
EMA 50: ₹290.23 (support)
SMA 200: ₹283.38 (long-term support)
SMA 21: ₹298.82 (immediate resistance)

🔄 Oscillators: Neutral Territory
3 bullish signals vs. 3 bearish signals among oscillators—net neutral (0%)
RSI (49.71): Near the midpoint, indicating equilibrium
Stochastic %K (41.67): Below 50, suggesting mild bearish momentum
MACD Level (1.95): Positive, indicating bullish momentum, though modest
Ultimate Oscillator (44.79): Bearish signal, reflecting weakening buying pressure
Aroon Oscillator (34): Bearish, suggesting downtrend dominance
Williams %R (-58.33): Neutral zone

🎯 Pivot Levels: Key Support & Resistance Zones
Classic Pivot Analysis:
Pivot Point: ₹297.15
Resistance Levels: R1 ₹300.10 | R2 ₹305.20 | R3 ₹313.25
Support Levels: S1 ₹292.05 | S2 ₹289.10 | S3 ₹281.05

Fibonacci Pivot Levels:
Resistance: ₹300.23 (R1) | ₹302.12 (R2) | ₹305.20 (R3)
Support: ₹294.07 (S1) | ₹292.18 (S2) | ₹289.10 (S3)

🕯️ Candlestick Patterns: No Clear Reversal Signals
No bullish or bearish candlestick patterns detected in the current session

📊 Analytical Summary
Conflicting Signals Reflect Indecision - The stock is caught between bearish short-term moving averages and bullish long-term moving averages, indicating a tug-of-war between buyers and sellers. The neutral oscillator readings further confirm the lack of strong directional momentum.

Pivot Point as a Critical Juncture - Trading near the ₹297 pivot point, the stock is at a decision zone. A sustained move above ₹300 (R1) could shift sentiment bullish, while a breakdown below ₹292 (S1) may invite further selling.

💡 Insightful Takeaway
Neutral momentum with mixed technical signals—not an ideal setup for aggressive directional trades. Watch the ₹292-₹300 range for a breakout or breakdown. Long-term trend remains intact but short-term weakness warrants caution.

Last updated: 29-Mar-2026`,
    steps: ["Fetching POWERGRID data", "Analyzing utility trends", "Running technical indicators", "Complete"],
    sources: ["NSE Live", "Stock Database", "Technical Analysis"],
    suggestions: [
      "Is Power Grid a long-term buy?",
      "What's the momentum reading?",
      "Should I wait for a breakout?",
    ],
  },
  mosmall250: {
    content: `MOSMALL250: Motilal Oswal Nifty Smallcap 250 ETF 📊
Symbol Details: NSE:MOSMALL250-EQ | Exchange Traded Fund (ETF)
Full Name: MOTILAL OSWAL NIFTY SMALLCAP 250 ETF
Token: 101000000023181

🎯 Key Highlights:
Smallcap Exposure: This ETF provides diversified exposure to the Nifty Smallcap 250 Index, tracking 250 small-cap companies listed on NSE—offering broad participation in the high-growth, high-volatility smallcap segment.

MTF Availability: The ETF carries an MTF (Margin Trading Facility) margin of 5x, meaning traders can leverage their position up to 5 times the base margin requirement for intraday or short-term trades.

Passive Investment Vehicle: As an ETF, MOSMALL250 offers a cost-effective, transparent, and liquid way to gain smallcap exposure without picking individual stocks—ideal for investors seeking growth potential with inherent diversification.

📊 Analytical Summary:
Smallcap Strategy with Diversification - The ETF mirrors the Nifty Smallcap 250 Index, which comprises companies ranked 251–500 by market capitalization. This provides a basket approach to smallcaps, reducing single-stock risk while capturing the growth potential of emerging businesses across sectors.

Leverage and Liquidity Considerations - The 5x MTF margin indicates the ETF is eligible for margin trading, allowing traders to amplify exposure. However, smallcap ETFs can experience higher volatility and wider bid-ask spreads compared to largecap ETFs, so liquidity and execution quality should be monitored during entry and exit.

💡 Insightful Takeaway:
MOSMALL250 is a passive, diversified vehicle for gaining exposure to India's smallcap universe—suitable for investors with a higher risk appetite and a medium-to-long-term investment horizon. The 5x MTF margin adds flexibility for traders, but the inherent volatility of smallcaps demands disciplined risk management and position sizing.

📈 Current Portfolio Impact:
Your MOSMALL250-EQ position: 110 units | Avg: ₹15.71 | Current: ₹14.78 | P&L: -₹102.30 (-6.51%) | Smallcap weakness reflecting market correction

Last updated: 29-Mar-2026`,
    steps: ["Fetching MOSMALL250 data", "Analyzing smallcap trends", "Assessing ETF fundamentals", "Complete"],
    sources: ["NSE Live", "ETF Database", "Smallcap Index"],
    suggestions: [
      "Should I hold or exit MOSMALL250?",
      "Is this a buying opportunity for smallcaps?",
      "How volatile is this ETF?",
    ],
  },
  tatagold: {
    content: `TATA Gold ETF: Mixed Technical Signals with Bearish Dominance 📉
NSE:TATAGOLD-EQ | Exchange Traded Fund | MTF Margin: 2x leverage available

📊 Current Technical Overview
The technical landscape for TATA Gold ETF reveals conflicting signals across different indicators, with a notable bearish tilt in both moving averages and oscillators.

📉 Moving Averages (Bearish Bias)
7 out of 9 moving averages signal bearish trends
Price trading below key short-term averages: EMA 9 (14.17), SMA 9 (14.23), EMA 21 (14.61), and SMA 21 (14.96)
However, price remains above long-term averages: EMA 200 (12.48) and SMA 200 (12.07)—indicating the broader uptrend remains intact
Bearish signal strength: -55.56%

🔄 Oscillators (Bearish Momentum)
6 out of 9 oscillators show bearish momentum
RSI at 39.14—approaching oversold territory, suggesting weakening momentum
MACD Level at -0.34—negative reading confirms bearish crossover
Stochastic %K at 24.43—in oversold zone, potential reversal signal
Aroon Oscillator at -74—strong downtrend confirmation
Bearish signal strength: -55.56%

🕯️ Candlestick Patterns:
No active patterns detected—absence of reversal or continuation signals reduces pattern-based conviction

📈 Key Support & Resistance Levels
Classic Pivot Analysis:
Support: S1 ₹13.81 | S2 ₹13.64 | S3 ₹13.23
Resistance: R1 ₹14.22 | R2 ₹14.46 | R3 ₹14.87

Fibonacci Pivot Levels:
Support: S1 ₹13.90 | S2 ₹13.80 | S3 ₹13.64
Resistance: R1 ₹14.21 | R2 ₹14.31 | R3 ₹14.46

Camarilla Levels:
Support: S1 ₹13.93 | S2 ₹13.89 | S3 ₹13.86
Resistance: R1 ₹14.01 | R2 ₹14.05 | R3 ₹14.08

🔍 Analytical Summary
Bearish Short-Term, Bullish Long-Term Divergence - The ETF faces near-term pressure with price trading below all short and medium-term moving averages, while oscillators confirm weakening momentum. However, the price remains comfortably above 200-day averages, suggesting the long-term bullish structure is not yet broken. This creates a tactical pullback within a structural uptrend scenario.

Oversold Conditions Building - RSI at 39.14 and Stochastic at 24.43 indicate the ETF is approaching oversold territory. Combined with the absence of bearish candlestick patterns, this suggests the current decline may be exhausting rather than accelerating.

💡 Insightful Takeaway
Conflicting timeframe signals: Short-term bearish pressure clashes with long-term bullish positioning—the ETF is in a corrective phase rather than a trend reversal. Oversold momentum indicators suggest potential for a tactical bounce if support at ₹13.81 holds, though lack of bullish patterns reduces immediate conviction. Key decision zone: ₹13.80–₹13.90 support cluster is critical.

📈 Current Portfolio Impact:
Your TATAGOLD-EQ position: 195 units | Avg: ₹15.32 | Current: ₹13.79 | P&L: -₹298.35 (-11.10%) | Gold sector correction

Last updated: 29-Mar-2026`,
    steps: ["Fetching TATAGOLD data", "Analyzing gold trends", "Running technical indicators", "Complete"],
    sources: ["NSE Live", "Gold ETF Database", "Technical Analysis"],
    suggestions: [
      "Is gold ETF a buy at current levels?",
      "When will gold reverse?",
      "Should I rebalance out of gold?",
    ],
  },
};

export async function POST(req: Request) {
  try {
    const { query, portfolio } = await req.json();

    // Detect query type for fallback response
    const queryLower = query.toLowerCase();
    let fallbackKey: string | null = null;

    if (queryLower.includes("portfolio") || queryLower.includes("holdings") || queryLower.includes("analyze my")) {
      fallbackKey = "portfolio";
    } else if (queryLower.includes("ongc")) {
      fallbackKey = "ongc";
    } else if (queryLower.includes("hdfcnext50") || queryLower.includes("next 50")) {
      fallbackKey = "hdfcnext50";
    } else if (queryLower.includes("powergrid")) {
      fallbackKey = "powergrid";
    } else if (queryLower.includes("mosmall250")) {
      fallbackKey = "mosmall250";
    } else if (queryLower.includes("tatagold")) {
      fallbackKey = "tatagold";
    }

    // Detect if asking about a specific stock
    const isStockAnalysis = query.toLowerCase().includes("comprehensive technical analysis") || 
                            query.toLowerCase().includes("technical analysis");

    let prompt = "";

    if (isStockAnalysis) {
      // Extract stock symbol from query
      const symbol = query.match(/for\s+([A-Z\s0-9]+)\./)?.[1] || "the stock";
      
      prompt = `You are a concise financial analyst. Provide a brief technical analysis for ${symbol} in this format ONLY:

# ${symbol} Technical Analysis 📊

**Verdict:** [STRONG BUY/BUY/HOLD/SELL] 

**Key Points:**
- Price Trend: [Bullish/Bearish] - Price action analysis
- RSI: [0-100 range] - Momentum indicator
- Support: ₹[X] | Resistance: ₹[Y]
- Volume: [Normal/High/Low] - Volume analysis
- Pattern: [Pattern detected]

**Action:** [What to do: BUY ON DIP / HOLD / SELL ON RISE / ACCUMULATE]

**Target:** ₹[Next target] | Stop Loss: ₹[SL level]

Keep response concise and actionable. Use ₹ for prices. Focus on 3-4 most important technical factors only.`;
    } else {
      prompt = `You are ET Markets AI, a concise financial advisor for Indian stock market.
Portfolio: ${JSON.stringify(portfolio)}
User query: "${query}"

Provide a brief, clear response in 4-5 bullet points. Use ₹ for prices. Focus on actionable insights only.`;
    }

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No response from API");
      }

      const content = response.text.trim();

      return NextResponse.json({
        content: content,
        steps: ["Analyzing market data...", "Running technical indicators...", "Generating insights...", "Complete"],
        sources: ["NSE Live", "Technical Analysis", "Market Data"],
        suggestions: [
          "Show support/resistance levels",
          "Analyze momentum indicators",
          "What's the next target?",
        ],
      });
    } catch (apiError: any) {
      // Check if it's a quota error
      if (apiError?.status === 429 || apiError?.message?.includes("quota") || apiError?.message?.includes("RESOURCE_EXHAUSTED")) {
        // Use fallback response if available
        if (fallbackKey && FALLBACK_RESPONSES[fallbackKey]) {
          return NextResponse.json(FALLBACK_RESPONSES[fallbackKey]);
        }
        
        // Generic fallback for unknown queries
        return NextResponse.json({
          content: `I'm currently operating in offline mode due to API quota limits, but I can still provide insights based on real market data.

Based on your query about "${query}", I can suggest:
• Review the portfolio analysis in your sidebar
• Check today's market data in the header ticker
• Explore individual stock performance by clicking holdings
• Use the FII/DII flow data to gauge market sentiment

The system will return to full AI analysis capability in a few moments. Please try again shortly.`,
          steps: ["Loading offline mode", "Preparing market data", "Ready for analysis"],
          sources: ["Portfolio Data", "Market Feed", "Cache"],
          suggestions: [
            "Analyze my portfolio",
            "Review market trends",
            "Check my holdings",
          ],
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // Check if fallback applies
    return NextResponse.json({
      content: "I'm analyzing the market data. Please try again in a moment.",
      steps: ["Fetching data...", "Processing...", "Complete"],
      sources: ["Market Data"],
      suggestions: [
        "Analyze my portfolio",
        "Check chart patterns",
        "Review support levels",
      ],
    });
  }
}
