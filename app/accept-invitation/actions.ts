"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
export async function acceptInvitation(data: FormData) {
  const token = z.string().min(20).safeParse(data.get("token"));
  if (!token.success) redirect("/accept-invitation?error=Invalid+invitation");
  const { supabase } = await requireUser();
  const { data: accepted, error } = await supabase.rpc(
    "accept_staff_invitation",
    { raw_token: token.data },
  );
  if (error || !accepted)
    redirect(
      "/accept-invitation?error=Invitation+is+invalid,+expired,+or+belongs+to+another+email",
    );
  redirect("/admin?message=Staff+access+activated");
}
