"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas/auth";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { jobsPath } from "@/lib/jobs/host";
import { hasJobsEmployer } from "@/lib/jobs/employer";

type LoginState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

// Deliberately its own Server Action, not src/app/login/actions.ts's shared
// one. That one's resolveLandingPath picks between a Growth dashboard and a
// KatisoBiz dashboard for a business owner who may hold both -- a genuinely
// different question from "does this login own a CV", and threading a
// fourth, unrelated persona through an already-exhaustively-tested
// precedence table for no shared behaviour isn't worth the risk to it. Same
// underlying Supabase Auth call either way; a candidate always lands on
// their own CV, nothing else to choose between.
export async function loginToJobs(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`jobs-login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts, please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: { _form: ["Incorrect email or password."] } };
  }

  // Routed by what the login actually owns, the same principle as
  // resolveLandingPath: an employer account wins (they came to hire), a
  // seeker lands on their dashboard (handoff Job 8: logging in always
  // lands somewhere useful, never the home page). A login with neither is
  // someone brand new; the dashboard forwards them into the CV builder.
  if (await hasJobsEmployer(data.user.id)) {
    redirect(await jobsPath("/employer"));
  }
  redirect(await jobsPath("/dashboard"));
}
