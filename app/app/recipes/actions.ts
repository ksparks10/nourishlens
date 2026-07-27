"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import {
  normalizeInstagramUrl,
  parseIngredientLine,
} from "@/lib/recipes/instagram";
export async function createRecipe(data: FormData) {
  const base = z
    .object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(1000),
      servings: z.coerce.number().positive().max(1000),
    })
    .safeParse(Object.fromEntries(data));
  if (!base.success) redirect("/app/recipes/new?error=Invalid+recipe");
  const ingredients = [0, 1, 2].flatMap((index) => {
    const food = z
      .string()
      .uuid()
      .safeParse(data.get(`food_${index}`));
    const grams = z.coerce
      .number()
      .positive()
      .max(100000)
      .safeParse(data.get(`grams_${index}`));
    return food.success && grams.success
      ? [{ food_id: food.data, grams: grams.data }]
      : [];
  });
  if (!ingredients.length)
    redirect("/app/recipes/new?error=Add+at+least+one+ingredient");
  const { supabase } = await requireUser();
  const { data: id, error } = await supabase.rpc("create_recipe", {
    p_name: base.data.name,
    p_description: base.data.description,
    p_servings: base.data.servings,
    p_ingredients: ingredients,
  });
  if (error || !id) redirect("/app/recipes/new?error=Unable+to+create+recipe");
  redirect(`/app/recipes/${id}`);
}

const importedRecipeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  servings: z.coerce.number().positive().max(1000),
  source_url: z.string().trim().max(500),
  source_caption: z.string().trim().max(20000),
  ingredients_text: z.string().trim().min(2).max(20000),
  instructions_text: z.string().trim().max(30000),
});

export async function createImportedRecipe(data: FormData) {
  const parsed = importedRecipeSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/app/recipes/import?error=Review+the+extracted+recipe");
  const sourceUrl = normalizeInstagramUrl(parsed.data.source_url);
  if (!sourceUrl)
    redirect("/app/recipes/import?error=Invalid+Instagram+link");
  const ingredients = parsed.data.ingredients_text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseIngredientLine)
    .slice(0, 60);
  const instructions = parsed.data.instructions_text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
  if (!ingredients.length)
    redirect("/app/recipes/import?error=Add+at+least+one+ingredient");

  const { supabase, user } = await requireUser();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      servings: parsed.data.servings,
      preparation_notes: instructions.join("\n") || null,
      source_url: sourceUrl,
      source_platform: "instagram",
      source_caption: parsed.data.source_caption || null,
      imported_ingredients: ingredients,
      import_status: "imported_text",
    })
    .select("id")
    .single();
  if (error || !recipe)
    redirect("/app/recipes/import?error=Unable+to+save+imported+recipe");
  redirect(`/app/recipes/${recipe.id}?message=Instagram+recipe+imported`);
}
