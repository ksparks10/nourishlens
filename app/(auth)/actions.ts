"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
export async function signIn(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=Invalid+email+or+password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=Unable+to+sign+in");
  redirect("/app");
}
export async function signUp(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/signup?error=Use+a+valid+email+and+8%2B+character+password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) redirect("/signup?error=Unable+to+create+account");
  redirect("/login?message=Check+your+email+to+verify+your+account");
}
export async function requestMagicLink(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect("/login?error=Enter+a+valid+email");
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  redirect("/login?message=Check+your+email+for+your+magic+link");
}
export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (email.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
    });
  }
  redirect("/login?message=If+the+account+exists,+a+reset+link+has+been+sent");
}
export async function updatePassword(formData: FormData) {
  const nextPassword = z
    .string()
    .min(8)
    .max(72)
    .safeParse(formData.get("password"));
  if (!nextPassword.success)
    redirect("/update-password?error=Password+must+be+8+to+72+characters");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: nextPassword.data,
  });
  if (error) redirect("/update-password?error=Reset+session+expired");
  redirect("/app?message=Password+updated");
}
