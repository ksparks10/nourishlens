import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  items: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        grams: z.number().positive().max(10000),
      }),
    )
    .min(1)
    .max(20),
  mealType: z.enum([
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack",
  ]),
  date: z.string().date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  const parsed = input.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Review every food and amount" },
      { status: 400 },
    );
  const { data, error } = await supabase.rpc("log_photo_meal", {
    p_items: parsed.data.items.map((item) => ({
      food_id: item.foodId,
      grams: item.grams,
    })),
    p_meal_type: parsed.data.mealType,
    p_date: parsed.data.date,
    p_time: parsed.data.time,
  });
  if (error)
    return Response.json(
      { error: "Unable to log the reviewed meal" },
      { status: 500 },
    );
  return Response.json({ data: { added: data, date: parsed.data.date } });
}
