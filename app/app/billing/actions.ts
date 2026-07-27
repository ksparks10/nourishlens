"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { promoCodeInput } from "@/lib/validation/billing";
export async function redeemCode(data: FormData) {
  const code = promoCodeInput.safeParse(data.get("code"));
  if (!code.success) redirect("/app/billing?error=Enter+a+valid+access+code");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("redeem_promo_code", {
    raw_code: code.data,
  });
  if (error)
    redirect(
      `/app/billing?error=${encodeURIComponent(error.message.includes("already") ? "This code was already redeemed" : "Code is invalid, inactive, expired, or at its limit")}`,
    );
  redirect("/app/billing?message=Complimentary+access+activated");
}
