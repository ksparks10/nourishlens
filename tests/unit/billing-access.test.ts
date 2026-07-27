import { describe, expect, it } from "vitest";
import {
  grantAllowsAccess,
  normalizePromoCode,
  promoCodeInput,
  subscriptionAllowsAccess,
} from "../../lib/validation/billing";
describe("promo codes", () => {
  it("normalizes FREEFORME case-insensitively", () =>
    expect(normalizePromoCode("  freeforme  ")).toBe("FREEFORME"));
  it("accepts supported code characters", () =>
    expect(promoCodeInput.safeParse(" welcome-2026 ").success).toBe(true));
  it("rejects spaces inside codes", () =>
    expect(promoCodeInput.safeParse("FREE FOR ME").success).toBe(false));
});
describe("subscription access", () => {
  const future = new Date("2030-01-01");
  const past = new Date("2020-01-01");
  const now = new Date("2026-01-01");
  it("allows active and trialing subscriptions", () => {
    expect(subscriptionAllowsAccess("active", future, now)).toBe(true);
    expect(subscriptionAllowsAccess("trialing", future, now)).toBe(true);
  });
  it("rejects expired, canceled, past-due and unpaid access", () => {
    expect(subscriptionAllowsAccess("active", past, now)).toBe(false);
    for (const status of ["canceled", "past_due", "unpaid", "incomplete"])
      expect(subscriptionAllowsAccess(status, future, now)).toBe(false);
  });
});
describe("complimentary grants", () => {
  const now = new Date("2026-01-01");
  it("allows permanent and current grants", () => {
    expect(
      grantAllowsAccess(
        { startsAt: new Date("2025-01-01"), expiresAt: null, revokedAt: null },
        now,
      ),
    ).toBe(true);
    expect(
      grantAllowsAccess(
        {
          startsAt: new Date("2025-01-01"),
          expiresAt: new Date("2027-01-01"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(true);
  });
  it("rejects future, expired, and revoked grants", () => {
    expect(
      grantAllowsAccess(
        { startsAt: new Date("2027-01-01"), expiresAt: null, revokedAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      grantAllowsAccess(
        {
          startsAt: new Date("2025-01-01"),
          expiresAt: new Date("2025-12-31"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      grantAllowsAccess(
        { startsAt: new Date("2025-01-01"), expiresAt: null, revokedAt: now },
        now,
      ),
    ).toBe(false);
  });
});
