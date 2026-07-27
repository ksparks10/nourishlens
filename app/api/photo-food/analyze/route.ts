import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { searchInternalRobust } from "@/lib/nutrition/search";
import {
  isLikelyEdibleDetection,
  isPlausiblePhotoCatalogMatch,
} from "@/lib/nutrition/photo-detection";

const detectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  preparation: z.string().trim().max(120).default(""),
  confidence: z.coerce
    .number()
    .transform((value) => (value > 1 && value <= 100 ? value / 100 : value))
    .pipe(z.number().min(0).max(1)),
  portionDescription: z.string().trim().max(160),
  estimatedGrams: z.coerce.number().positive().max(3000),
  uncertaintyNotes: z.string().trim().max(300).default(""),
});
const analysisSchema = z.object({
  foods: z.array(detectionSchema).min(1).max(20),
  mealNotes: z.string().trim().max(500).default(""),
});

async function ollamaTags() {
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, {
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Ollama is unavailable");
  return response.json() as Promise<{
    models?: { name?: string; model?: string }[];
  }>;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    const tags = await ollamaTags();
    const installed = (tags.models ?? []).some((item) =>
      [item.name, item.model].some(
        (name) =>
          name === env.OLLAMA_VISION_MODEL ||
          name?.startsWith(`${env.OLLAMA_VISION_MODEL}:`),
      ),
    );
    return Response.json({
      connected: true,
      installed,
      model: env.OLLAMA_VISION_MODEL,
    });
  } catch {
    return Response.json({
      connected: false,
      installed: false,
      model: env.OLLAMA_VISION_MODEL,
    });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  const { data: limits } = await supabase.rpc("consume_rate_limit", {
    p_scope: "photo_food_analysis",
    p_subject: user.id,
    p_limit: 10,
    p_window_seconds: 3600,
  });
  if (limits?.[0] && !limits[0].allowed)
    return Response.json(
      { error: "Photo-analysis limit reached. Try again later." },
      { status: 429 },
    );
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File))
    return Response.json({ error: "Choose a meal photo" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type))
    return Response.json(
      { error: "Use a JPEG, PNG, or WebP image" },
      { status: 400 },
    );
  if (image.size > 10 * 1024 * 1024)
    return Response.json(
      { error: "Photo must be smaller than 10 MB" },
      { status: 400 },
    );
  try {
    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const ollamaResponse = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: env.OLLAMA_VISION_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.1 },
        messages: [
          {
            role: "user",
            content:
              "Analyze this meal photo for assisted nutrition logging. Return edible foods and beverages only. Never include backgrounds, fabric, tablecloths, plates, bowls, trays, utensils, napkins, packaging, furniture, or other non-food objects. Identify each visually distinct edible item using ordinary searchable food names and include preparation when visible. Use a specific common name for visible sauces and dressings when the meal context supports it—for example, Caesar dressing on a clearly identified Caesar salad—rather than returning only 'dressing' or 'sauce'. Do not claim specificity when the type is genuinely unclear. Estimate the edible grams of every component independently from its visible volume and typical density. Do not use 100 g as a generic default and do not assign the same weight to every component. For calibration, a restaurant side salad often has roughly 60–120 g leafy greens, 15–35 g croutons, 5–20 g grated hard cheese, and 20–40 g dressing, but use the actual image rather than copying these examples. Estimate conservatively and state uncertainty. Include a sauce or dressing only when it is visibly present; do not invent hidden ingredients, brands, oils, or exact recipes. Return only JSON shaped as {foods:[{name,preparation,confidence,portionDescription,estimatedGrams,uncertaintyNotes}],mealNotes}. Confidence must be 0 to 1. If foods overlap, list components only when visually distinguishable.",
            images: [base64],
          },
        ],
      }),
    });
    if (!ollamaResponse.ok) {
      const detail = await ollamaResponse.text();
      throw new Error(detail || `Ollama failed (${ollamaResponse.status})`);
    }
    const ollama = (await ollamaResponse.json()) as {
      message?: { content?: string };
    };
    const content = ollama.message?.content?.replace(
      /^```json\s*|\s*```$/g,
      "",
    );
    const analysis = analysisSchema.parse(JSON.parse(content ?? "{}"));
    const edibleDetections = analysis.foods.filter((food) =>
      isLikelyEdibleDetection(food.name, food.preparation),
    );
    if (!edibleDetections.length)
      return Response.json(
        { error: "No edible food was confidently detected in this photo." },
        { status: 422 },
      );
    const foods = await Promise.all(
      edibleDetections.map(async (food) => {
        const query = `${food.name} ${food.preparation}`.trim();
        const candidates = (await searchInternalRobust(supabase, query, 10))
          .filter((candidate) =>
            isPlausiblePhotoCatalogMatch(food.name, candidate.name),
          )
          .slice(0, 5);
        return { ...food, candidates };
      }),
    );
    return Response.json({ data: { foods, mealNotes: analysis.mealNotes } });
  } catch (error) {
    console.error("Local meal photo analysis failed", error);
    const detail = error instanceof Error ? error.message : "";
    return Response.json(
      {
        error: detail.includes("Failed to load image")
          ? "The local model could not read this photo encoding. Choose the photo again so the app can convert it to a standard JPEG."
          : detail.includes("timeout") || detail.includes("aborted")
            ? "Local analysis took too long. Try a smaller or more tightly cropped photo."
            : "Local photo analysis failed. Confirm Ollama is running and try the photo again.",
      },
      { status: 503 },
    );
  }
}
