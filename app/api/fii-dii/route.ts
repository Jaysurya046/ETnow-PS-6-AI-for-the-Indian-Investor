import { getInstitutionalFlows } from "@/lib/institutional-flows";

export const runtime = "nodejs";
export async function GET() {
  return Response.json(await getInstitutionalFlows(), { headers: { "Cache-Control": "no-store" } });
}
