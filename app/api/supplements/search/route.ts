import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { externalResult } from "@/lib/nutrition/search";
import { normalizeSearchQuery } from "@/lib/nutrition/search-query";
import { DsldProvider } from "@/providers/nutrition/dsld";

const input = z.object({ q: z.string().trim().min(2).max(100) });

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: { message: "Sign in required" } },
      { status: 401 },
    );
  const parsed = input.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      { error: { message: "Enter at least two characters" } },
      { status: 400 },
    );
  const { data: limits, error: limitError } = await supabase.rpc(
    "consume_rate_limit",
    {
      p_scope: "supplement_search",
      p_subject: user.id,
      p_limit: 40,
      p_window_seconds: 60,
    },
  );
  if (limitError)
    return Response.json(
      { error: { message: "Search protection unavailable" } },
      { status: 503 },
    );
  if (limits?.[0] && !limits[0].allowed)
    return Response.json(
      { error: { message: "Too many searches. Please wait a moment." } },
      { status: 429 },
    );
  try {
    const foods = await new DsldProvider().searchFoods({
      query: normalizeSearchQuery(parsed.data.q),
      pageSize: 20,
    });
    return Response.json({ data: foods.map(externalResult) });
  } catch (error) {
    console.error("NIH supplement search failed", error);
    return Response.json(
      {
        error: {
          message:
            "NIH supplement search is temporarily unavailable. Try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
