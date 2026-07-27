import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";

const entryIdSchema = z.string().uuid();

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = entryIdSchema.safeParse((await context.params).id);
  if (!id.success)
    return Response.json({ error: "Invalid Food log entry" }, { status: 400 });
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("duplicate_food_entry", {
    p_entry_id: id.data,
  });
  if (error || !data)
    return Response.json(
      { error: "Unable to duplicate this food" },
      { status: 400 },
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  return Response.json({ id: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = entryIdSchema.safeParse((await context.params).id);
  if (!id.success)
    return Response.json({ error: "Invalid Food log entry" }, { status: 400 });
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return Response.json(
      { error: "Unable to delete this food" },
      { status: 400 },
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  return Response.json({ id: data.id });
}
