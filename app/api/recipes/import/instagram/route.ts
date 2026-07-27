import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  captionFromInstagramHtml,
  normalizeInstagramUrl,
  parseRecipeCaption,
} from "@/lib/recipes/instagram";

const inputSchema = z.object({
  url: z.string().trim().max(500),
  caption: z.string().trim().max(20000).optional().default(""),
});

async function readLimitedText(response: Response, maximum = 2_000_000) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) throw new Error("Instagram response was too large");
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

async function fetchPublicCaption(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; NourishLensRecipeImporter/1.0; +https://nourish-lens-ksparks.kevin358349.chatgpt.site)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok || !normalizeInstagramUrl(response.url))
    throw new Error("Instagram did not return a public post");
  return captionFromInstagramHtml(await readLimitedText(response));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter a valid Instagram post or reel link." },
      { status: 400 },
    );
  const sourceUrl = normalizeInstagramUrl(parsed.data.url);
  if (!sourceUrl)
    return Response.json(
      { error: "Only Instagram post and reel links can be imported." },
      { status: 400 },
    );

  const { data: limits } = await supabase.rpc("consume_rate_limit", {
    p_scope: "instagram_recipe_import",
    p_subject: user.id,
    p_limit: 15,
    p_window_seconds: 3600,
  });
  if (limits?.[0] && !limits[0].allowed)
    return Response.json(
      { error: "Too many imports. Try again later." },
      { status: 429 },
    );

  let caption = parsed.data.caption;
  if (!caption) {
    try {
      caption = (await fetchPublicCaption(sourceUrl)) ?? "";
    } catch {
      caption = "";
    }
  }
  if (!caption)
    return Response.json(
      {
        error:
          "Instagram did not expose this caption. Paste the caption below to finish the import.",
        needsCaption: true,
        sourceUrl,
      },
      { status: 422 },
    );

  const recipe = parseRecipeCaption(caption);
  if (!recipe.ingredients.length)
    return Response.json(
      {
        error:
          "We found the caption but could not identify an ingredient list. Paste or edit the caption with one ingredient per line.",
        needsCaption: true,
        sourceUrl,
        caption,
      },
      { status: 422 },
    );

  return Response.json({ sourceUrl, caption, recipe });
}
