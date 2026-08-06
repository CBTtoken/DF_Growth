import { cookies } from "next/headers";

// Building and downloading a CV needs no account (spec: "frictionless").
// A draft jobs_candidates row (owner_user_id null) is created on the first
// answer and edited via this cookie alone until the person signs up, at
// which point signup claims it by setting owner_user_id.
//
// A plain httpOnly cookie holding the draft row's own id, not a signed
// token: the id is already an unguessable uuid, RLS grants no anon access
// to jobs_candidates at all (every read/write goes through a Server Action
// using the service role), and the Server Action always re-checks
// owner_user_id is still null before touching a row this cookie names --
// so the cookie can only ever be used to resume a draft that has not been
// claimed by anyone, never to reach someone else's saved CV.
const COOKIE_NAME = "jobs_draft_cv";

export async function getDraftCandidateId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function setDraftCandidateId(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // 30 days: long enough that someone typing a CV over a lunch break and
    // several evenings does not lose it, short enough that an abandoned
    // draft does not linger indefinitely.
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearDraftCandidateId(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
