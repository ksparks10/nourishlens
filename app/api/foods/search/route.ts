import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  cacheExternalFoods,
  externalResult,
  searchInternal,
} from "@/lib/nutrition/search";
import {
  deduplicateFoods,
  rankFoodResults,
} from "@/lib/nutrition/search-ranking";
import { providersForQuery } from "@/providers/nutrition/registry";
import type { NormalizedFood } from "@/providers/nutrition";
import {
  foodNameMatchScore,
  normalizeSearchQuery,
} from "@/lib/nutrition/search-query";
const input = z.object({
  q: z.string().trim().min(2).max(100),
  page: z.coerce.number().int().min(1).max(100).default(1),
  source: z.enum(["internal", "all"]).default("internal"),
});
export async function GET(request: NextRequest) {
  const supabase = await createClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  const parsed = input.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "invalid_query",
          message: "Enter at least two characters",
        },
      },
      { status: 400 },
    );
  const { data: limitRows, error: limitError } = await supabase.rpc(
      "consume_rate_limit",
      {
        p_scope: "food_search",
        p_subject: user.id,
        p_limit: 20,
        p_window_seconds: 60,
      },
    ),
    limit = limitRows?.[0];
  if (limitError)
    return Response.json(
      {
        error: {
          code: "rate_limit_unavailable",
          message: "Search protection unavailable",
        },
      },
      { status: 503 },
    );
  if (limit && !limit.allowed)
    return Response.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many searches",
          retryAfter: limit.retry_after,
        },
      },
      { status: 429, headers: { "Retry-After": String(limit.retry_after) } },
    );
  try {
    const normalizedQuery = normalizeSearchQuery(parsed.data.q);
    const internal = await searchInternal(
      supabase,
      normalizedQuery,
      20,
      (parsed.data.page - 1) * 20,
    );
    let results = internal,
      providerErrors = 0;
    if (parsed.data.source === "all") {
      const selectedProviders = providersForQuery(normalizedQuery);
      const settled = await Promise.allSettled(
          selectedProviders.map((provider) =>
            provider.searchFoods({
              query: normalizedQuery,
              page: parsed.data.page,
              pageSize: 6,
            }),
          ),
        ),
        external: NormalizedFood[] = rankFoodResults(
          deduplicateFoods(
            settled.flatMap((result) =>
              result.status === "fulfilled" ? result.value : [],
            ),
          ),
          normalizedQuery,
        );
      await cacheExternalFoods(
        external.filter(
          (food) => food.provider !== "nih_dsld" || food.nutrients.length > 0,
        ),
      );
      results = [...internal, ...external.map(externalResult)].sort((a, b) => {
        const relevanceDifference =
          foodNameMatchScore(normalizedQuery, b.name, b.brand) -
          foodNameMatchScore(normalizedQuery, a.name, a.brand);
        if (relevanceDifference) return relevanceDifference;
        const genericDifference =
          Number(b.foodType === "generic" && !b.brand) -
          Number(a.foodType === "generic" && !a.brand);
        if (genericDifference) return genericDifference;
        return b.dataCompleteness - a.dataCompleteness;
      });
      providerErrors = settled.filter(
        (result) => result.status === "rejected",
      ).length;
    }
    await supabase.from("product_events").insert({
      user_id: user.id,
      event_name: "food.search",
      properties: {
        result_count: results.length,
        source: parsed.data.source,
        query_length: parsed.data.q.length,
        providers:
          parsed.data.source === "all"
            ? providersForQuery(parsed.data.q).length
            : 0,
      },
    });
    return Response.json({
      data: results,
      page: parsed.data.page,
      hasMore: internal.length === 20,
      providerErrors,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "search_unavailable",
          message: "Food search is temporarily unavailable",
        },
      },
      { status: 503 },
    );
  }
}
