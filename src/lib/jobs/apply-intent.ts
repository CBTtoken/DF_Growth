import { cookies } from "next/headers";

/**
 * The job somebody was trying to apply for when we sent them away to make
 * an account.
 *
 * Dewald, 7 August: "I did a job seeker walk through and the logical does
 * not work too great." This was the worst of it. Tapping "Apply with my
 * CV" while logged out redirected to the CV builder and forgot the job
 * entirely. The person then answered eleven questions, signed up,
 * confirmed a code, and landed on a dashboard, having never applied for
 * the thing they came to apply for, with nothing on any screen to remind
 * them what it was. Every one of those people is lost, and the funnel
 * would have shown them as a successful signup.
 *
 * So the vacancy id is parked in a cookie on the way out and read back on
 * the way in: after signup, after login, and after the CV is finished, the
 * person lands back on the advert with the apply box open.
 *
 * A plain httpOnly cookie holding a public uuid, same reasoning as
 * jobs_draft_cv: the vacancy id is already on the public URL of a page
 * anyone can read, so the cookie carries nothing that is not already
 * theirs to see, and applying still checks the login and the CV
 * server-side before it writes anything.
 */
const COOKIE_NAME = "jobs_apply_intent";

export async function getApplyIntent(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value ?? null;
  // Never hand a malformed value to a query or a redirect path.
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : null;
}

/**
 * The parked vacancy, but only if it is still a real job somebody can
 * apply for.
 *
 * Found on 9 August 2026 by walking the login with an old cookie still
 * set: the job had been taken down in the meantime, and logging in sent
 * the person to a 404. That is a worse dead end than the one the intent
 * cookie was built to fix, and it lands on somebody at the exact moment
 * they have just proved who they are.
 *
 * Callers redirect to the dashboard when this returns null, which is the
 * honest outcome: the job is gone, and the dashboard is where the rest of
 * their applications are.
 *
 * Read-only on purpose. It is called from Server Components (the CV
 * builder page) as well as Server Actions, and a Server Component may not
 * write cookies: Next throws "Cookies can only be modified in a Server
 * Action or Route Handler" and the whole page becomes an error screen.
 * The first version of this cleared the stale cookie here and took the CV
 * builder down with it. Nothing needs clearing anyway: the cookie lasts
 * two hours, applyToVacancy clears it on success, and a stale value is
 * simply ignored every time it is read.
 */
export async function getLiveApplyIntent(): Promise<string | null> {
  const id = await getApplyIntent();
  if (!id) return null;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient()
    .from("jobs_vacancies")
    .select("id, expires_at")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;

  // An expired post is still readable but can no longer be applied to, so
  // it is not somewhere to send somebody who just logged in to apply.
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  return data.id;
}

export async function setApplyIntent(vacancyId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, vacancyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Two hours. Long enough to build a CV, sign up and read a confirmation
    // code out of an email; short enough that a job someone browsed last
    // week does not ambush them the next time they log in.
    maxAge: 60 * 60 * 2,
    path: "/",
  });
}

export async function clearApplyIntent(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
