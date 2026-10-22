import { NextResponse } from "next/server";
import { getChartData, RANGES, type TimeRange } from "@/lib/chart-data";
import { normalizeSymbol } from "@/lib/market-data";

export const revalidate = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = normalizeSymbol(params.get("symbol") || "RELIANCE");
  const range = params.get("range") || "1M";
  if (!symbol || !RANGES.includes(range as TimeRange)) return NextResponse.json({ error: "Invalid symbol or range" }, { status: 400 });
  try {
    return NextResponse.json(await getChartData(symbol, range as TimeRange));
  } catch {
    return NextResponse.json({ error: "Chart data is unavailable" }, { status: 502 });
  }
}
