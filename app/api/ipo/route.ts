import { getIpos } from "@/lib/ipo-feed";

export const runtime = "nodejs";
export async function GET() {
  return Response.json(await getIpos(), { headers: { "Cache-Control": "no-store" } });
}
