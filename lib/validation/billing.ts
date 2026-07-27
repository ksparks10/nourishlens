import { z } from "zod";
export const normalizePromoCode = (value: string) => value.trim().toUpperCase();
export const promoCodeInput = z
  .string()
  .transform(normalizePromoCode)
  .pipe(
    z
      .string()
      .min(3)
      .max(64)
      .regex(/^[A-Z0-9_-]+$/),
  );
export const checkoutPlan = z.enum(["monthly", "annual"]);
export function subscriptionAllowsAccess(
  status: string,
  periodEnd: Date | null,
  now = new Date(),
) {
  return (
    ["active", "trialing"].includes(status) && (!periodEnd || periodEnd > now)
  );
}
export function grantAllowsAccess(
  grant: { startsAt: Date; expiresAt: Date | null; revokedAt: Date | null },
  now = new Date(),
) {
  return (
    !grant.revokedAt &&
    grant.startsAt <= now &&
    (!grant.expiresAt || grant.expiresAt > now)
  );
}
