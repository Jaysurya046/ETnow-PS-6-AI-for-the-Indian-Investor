export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthResponse {
  status: "ok";
  timestamp: string;
  uptime: number;
}

export function GET(): Response {
  const health: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  return Response.json(health, { headers: { "Cache-Control": "no-store" } });
}
