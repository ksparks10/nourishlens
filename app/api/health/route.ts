import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const started = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("app_settings").select("key").limit(1);
    if (error) throw error;
    return Response.json(
      {
        status: "healthy",
        database: "reachable",
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        status: "unhealthy",
        database: "unreachable",
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
