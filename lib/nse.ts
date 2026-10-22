const ORIGIN = "https://www.nseindia.com";
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
  "Accept-Language": "en-IN,en;q=0.9",
  Accept: "application/json, text/plain, */*",
  Referer: `${ORIGIN}/`,
};
let cookie = "";
let session: Promise<void> | null = null;
let sessionExpires = 0;

function rememberCookies(response: Response) {
  const values = response.headers.getSetCookie();
  if (!values.length) return;
  const jar = new Map(cookie.split("; ").filter(Boolean).map(part => {
    const index = part.indexOf("=");
    return [part.slice(0, index), part.slice(index + 1)];
  }));
  for (const value of values) {
    const pair = value.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  cookie = [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function warmSession() {
  if (!session && Date.now() >= sessionExpires) {
    session = (async () => {
      const response = await fetch(ORIGIN, { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) });
      rememberCookies(response);
      await response.body?.cancel();
      if (!response.ok) throw new Error("NSE session unavailable");
      sessionExpires = Date.now() + 30 * 60_000;
    })().finally(() => { session = null; });
  }
  await session;
}

/** Fixed NSE paths only; normal session bootstrap, one retry, bounded network time. */
export async function nseJson(path: string): Promise<unknown> {
  if (!path.startsWith("/api/")) throw new Error("Invalid NSE path");
  // Some deployments can access APIs directly even when the homepage is blocked.
  await warmSession().catch(() => undefined);
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${ORIGIN}${path}`, {
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    rememberCookies(response);
    if ((response.status === 401 || response.status === 403) && attempt === 0) {
      await response.body?.cancel();
      cookie = ""; sessionExpires = 0;
      await warmSession().catch(() => undefined);
      continue;
    }
    if (!response.ok) throw new Error(`NSE feed HTTP ${response.status}`);
    return response.json();
  }
  throw new Error("NSE feed unavailable");
}

export function rows(payload: unknown): Record<string, unknown>[] {
  if (!Array.isArray(payload)) throw new Error("Unexpected feed schema");
  return payload.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row));
}
export function numberValue(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const result = Number(String(value).replace(/[₹,]/g, "").trim());
  return Number.isFinite(result) ? result : undefined;
}
export function dateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const numeric = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  const named = /^(\d{1,2})[- ]([a-z]{3})[- ](\d{4})$/i.exec(text);
  const month = named ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[2].toLowerCase()) + 1 : 0;
  const key = numeric ? `${numeric[3]}-${numeric[2]}-${numeric[1]}`
    : named && month ? `${named[3]}-${String(month).padStart(2,"0")}-${named[1].padStart(2,"0")}`
    : /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  if (!key) return null;
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === key ? key : null;
}
export function displayDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
