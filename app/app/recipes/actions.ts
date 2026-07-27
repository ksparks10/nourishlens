"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
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
