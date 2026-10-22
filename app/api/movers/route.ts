import { NextResponse } from "next/server";
import { getMovers } from "@/lib/market-data";

// The SDK results are cached for 30s; defer provider requests until runtime.
export const revalidate = 30;
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await getMovers()); }
  catch { return NextResponse.json({ error: "Movers unavailable" }, { status: 502 }); }
}
