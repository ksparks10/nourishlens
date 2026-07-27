import { describe, expect, it } from "vitest";
import {
  normalizeInvitationEmail,
  ownershipTransfer,
  password,
  staffInvitation,
} from "../../lib/validation/auth";
import { safeInternalPath } from "../../lib/auth/redirect";
describe("authentication validation", () => {
  it("normalizes invitation email addresses", () =>
    expect(normalizeInvitationEmail("  OWNER@Example.COM ")).toBe(
      "owner@example.com",
    ));
  it("rejects short passwords", () =>
    expect(password.safeParse("short").success).toBe(false));
  it("accepts passwords at the supported boundary", () =>
    expect(password.safeParse("12345678").success).toBe(true));
  it("validates staff invitations", () =>
    expect(
      staffInvitation.safeParse({
        email: "staff@example.com",
        roleId: "3d0d084f-8f1e-4d0f-b736-a1d30a509c90",
      }).success,
    ).toBe(true));
  it("requires a meaningful ownership transfer reason", () =>
    expect(
      ownershipTransfer.safeParse({
        userId: "3d0d084f-8f1e-4d0f-b736-a1d30a509c90",
        reason: "no",
      }).success,
    ).toBe(false));
  it("blocks external callback redirects", () => {
    expect(safeInternalPath("//evil.example")).toBe("/app");
    expect(safeInternalPath("/account")).toBe("/account");
  });
});
