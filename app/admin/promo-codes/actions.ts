"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoCodeInput } from "@/lib/validation/billing";
const optionalPositive = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().positive().nullable(),
);
export async function createPromoCode(data: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(3).max(100),
      code: promoCodeInput,
      duration: optionalPositive,
      limit: optionalPositive,
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/promo-codes?error=Invalid+code+configuration");
  const { user } = await requirePermission("promo_codes.manage");
  const admin = createAdminClient();
  const hash = createHash("sha256").update(parsed.data.code).digest("hex");
  const hint = `${parsed.data.code.slice(0, 4)}…${parsed.data.code.slice(-3)}`;
  const { data: code, error } = await admin
    .from("promo_codes")
    .insert({
      name: parsed.data.name,
      code_hash: hash,
      code_hint: hint,
      access_duration_days: parsed.data.duration,
      redemption_limit: parsed.data.limit,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !code)
    redirect(
      "/admin/promo-codes?error=Code+already+exists+or+could+not+be+created",
    );
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "promo.create",
      target_type: "promo_code",
      target_id: code.id,
      reason: "Owner created promotional access code",
      metadata: {
        hint,
        duration: parsed.data.duration,
        limit: parsed.data.limit,
      },
    });
  redirect("/admin/promo-codes?message=Promo+code+created");
}
export async function updatePromoCode(data: FormData) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      active: z.string().optional(),
      duration: optionalPositive,
      limit: optionalPositive,
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/promo-codes?error=Invalid+code+configuration");
  const { supabase, user } = await requirePermission("promo_codes.manage");
  const { error } = await supabase
    .from("promo_codes")
    .update({
      is_active: parsed.data.active === "on",
      access_duration_days: parsed.data.duration,
      redemption_limit: parsed.data.limit,
    })
    .eq("id", parsed.data.id);
  if (error) redirect("/admin/promo-codes?error=Unable+to+update+code");
  const admin = createAdminClient();
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "promo.update",
      target_type: "promo_code",
      target_id: parsed.data.id,
      reason: "Owner updated promotional access code",
      metadata: {
        active: parsed.data.active === "on",
        duration: parsed.data.duration,
        limit: parsed.data.limit,
      },
    });
  redirect("/admin/promo-codes?message=Promo+code+updated");
}
export async function grantAccess(data: FormData) {
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      days: optionalPositive,
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect(
      "/admin/promo-codes?error=Valid+user,+duration,+and+reason+required",
    );
  const { supabase, user } = await requirePermission("billing.manage");
  const expires = parsed.data.days
    ? new Date(Date.now() + parsed.data.days * 86400000).toISOString()
    : null;
  const { data: grant, error } = await supabase
    .from("access_grants")
    .insert({
      user_id: parsed.data.user_id,
      grant_type: "admin",
      expires_at: expires,
      granted_by: user.id,
      reason: parsed.data.reason,
    })
    .select("id")
    .single();
  if (error || !grant)
    redirect("/admin/promo-codes?error=Unable+to+grant+access");
  const admin = createAdminClient();
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "access.grant",
      target_type: "access_grant",
      target_id: grant.id,
      reason: parsed.data.reason,
      metadata: { user_id: parsed.data.user_id, expires_at: expires },
    });
  redirect("/admin/promo-codes?message=Access+granted");
}
