import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { externalProviders } from "@/providers/nutrition/registry";
import { cacheExternalFoods } from "@/lib/nutrition/search";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const supabase = await createClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
  const barcode = z
    .string()
    .regex(/^\d{8,14}$/)
    .safeParse((await params).barcode);
  if (!barcode.success)
    return Response.json(
      { error: { code: "invalid_barcode" } },
      { status: 400 },
    );
  const { data: local } = await supabase
    .from("food_barcodes")
    .select("food_id,foods(id,name,brand,current_version_id)")
    .eq("barcode", barcode.data)
    .maybeSingle();
  if (local) return Response.json({ data: local, provider: "internal" });
  for (const provider of externalProviders()) {
    try {
      const food = await provider.getFoodByBarcode(barcode.data);
      if (food) {
        await cacheExternalFoods([food]);
        return Response.json({ data: food, provider: food.provider });
      }
    } catch {}
  }
  return Response.json(
    { error: { code: "not_found", message: "No food found for this barcode" } },
    { status: 404 },
  );
}
