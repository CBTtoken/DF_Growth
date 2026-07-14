"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetPasswordSchema } from "@/lib/schemas/auth";

type ResetPasswordState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

// Public Beta Polish Sprint Sec 1: unlike setPassword (which continues
// straight into the dashboard/onboard), this signs the session out and
// sends the user back to /login — a reset is a deliberate "I want to
// re-authenticate cleanly" action, and per the spec's own acceptance
// criteria a successful reset should invalidate the account's existing
// session tokens, not just add a password on top of the one already in
// use.
export async function resetPassword(_prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { _form: ["That reset link has expired or already been used — request a new one."] },
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
    app_metadata: { ...user.app_metadata, has_password: true },
  });

  if (error) {
    console.error("Failed to reset password", error);
    return { error: { _form: ["Could not reset your password, please try again."] } };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
