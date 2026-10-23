import { getCorporateInfo } from "@/lib/corporate-feed";
import { filterCorporateInfo, corporateSymbol } from "@/lib/corporate-utils";
import { NIFTY_100 } from "@/lib/nifty100";
import type { CorporateTab } from "@/lib/corporate-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const tab = params.get("tab") ?? "announcements";
  const raw = params.get("symbol");
  const symbols = raw === null ? NIFTY_100.map(stock=>corporateSymbol(stock.sym)) : raw.split(",").map(corporateSymbol);
  if (!["announcements","actions","results"].includes(tab) || symbols.length>100 || symbols.some(symbol=>!/^[A-Z0-9&-]{1,30}$/.test(symbol))) return Response.json({error:"Invalid category or symbols"},{status:400});
  const data = await getCorporateInfo(tab as CorporateTab);
  return Response.json(filterCorporateInfo(data,symbols),{headers:{"Cache-Control":"no-store"}});
}
