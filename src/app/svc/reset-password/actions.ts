"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { svcPath } from "@/lib/svc/host";

/**
 * Completes the reset started from the emailed recovery link. Signs the
 * session out afterwards and returns to login, matching the platform's own
 * reset behaviour: a reset is a deliberate re-authentication, and the old
 * session tokens should not survive it.
 */
export async function resetSvcPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = await svcPath("/reset-password");

  if (password.length < 8) redirect(`${back}?error=weak`);
  if (password !== confirm) redirect(`${back}?error=mismatch`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${back}?error=expired`);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("SVC password reset failed", error);
    redirect(`${back}?error=failed`);
  }

  await supabase.auth.signOut();
  redirect(await svcPath("/login"));
}
