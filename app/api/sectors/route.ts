import { NextResponse } from "next/server";
import { getSectors } from "@/lib/market-data";

// The SDK results are cached for 30s; defer provider requests until runtime.
export const revalidate = 30;
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const sectors = await getSectors();
    if (!sectors.length) throw new Error("No sector quotes");
    return NextResponse.json(sectors);
  } catch {
    return NextResponse.json({ error: "Sector data is unavailable" }, { status: 502 });
  }
}
