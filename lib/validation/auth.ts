import { z } from "zod";
export const emailAddress = z.string().trim().toLowerCase().email();
export const password = z.string().min(8).max(72);
export const normalizeInvitationEmail = (value: string) =>
  emailAddress.parse(value);
export const staffInvitation = z.object({
  email: emailAddress,
  roleId: z.string().uuid(),
});
export const ownershipTransfer = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});
