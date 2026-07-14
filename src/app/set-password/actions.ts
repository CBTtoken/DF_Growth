"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLandingPath } from "@/lib/auth/resolve-landing-path";
import { setPasswordSchema } from "@/lib/schemas/auth";

type SetPasswordState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

// Public Beta Polish Sprint Sec 1: shown right after an invite link (new
// signup) or a forced pre-migration login attempt establishes a session
// with no password set yet — this is what actually completes account
// activation. Requires the session already established by
// auth/callback/page.tsx; there's no email/current-password field here
// because ownership was already proven by clicking that email link.
export async function setPassword(_prevState: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse({
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
    redirect("/login");
  }

  const admin = createAdminClient();
  // Public Beta Polish Sprint Sec 1: app_metadata updates via the admin API
  // replace the whole object rather than merging, so the existing values
  // (provider/providers, managed by Supabase itself) are spread forward
  // rather than clobbered.
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
    app_metadata: { ...user.app_metadata, has_password: true },
  });

  if (error) {
    console.error("Failed to set password", error);
    return { error: { _form: ["Could not set your password, please try again."] } };
  }

  // Found live while verifying this section: changing a user's password
  // via the admin API invalidates that user's existing refresh tokens as a
  // side effect — including the very session (from the invite/migration
  // email link) this Server Action just read the user from. Without this,
  // the redirect below lands on a page that no longer sees anyone signed
  // in. Signing back in with the password just chosen gets a fresh,
  // genuinely valid session before the redirect, so the user still ends
  // up seamlessly inside their account rather than bounced to /login right
  // after "successfully" setting a password.
  await supabase.auth.signInWithPassword({ email: user.email!, password: parsed.data.password });

  const landingPath = await resolveLandingPath(user.id);
  redirect(landingPath);
}
