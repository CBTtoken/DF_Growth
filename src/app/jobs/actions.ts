"use server";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { jobsPath } from "@/lib/jobs/host";
import { clearDraftCandidateId } from "@/lib/jobs/draft-session";
import { clearApplyIntent } from "@/lib/jobs/apply-intent";

/**
 * Logging out of Jobs.
 *
 * This did not exist anywhere in the product until now, on either side.
 * A job seeker is very often on a shared or borrowed phone, which makes a
 * missing log out worse here than on any other product in this estate: the
 * next person to open the browser was landing in somebody else's CV, with
 * their name and mobile number on the screen.
 *
 * Signing out is not enough on its own, found by Dewald on 9 August 2026:
 * logged out in Chrome, tapped "Build my free CV", and his own name and
 * number came back. Two cookies outlive the session and both had to go:
 *
 * - `jobs_draft_cv` points at a CV built with no account. It exists so
 *   somebody can close the tab mid-CV and come back a week later, which is
 *   right for a person on their own phone and wrong for everybody after a
 *   log out. On a shared phone it is the exact leak log out was added to
 *   prevent: the next person taps Build my free CV and gets the previous
 *   person's details, editable.
 * - `jobs_apply_intent` names the job somebody was applying for. Less
 *   sensitive, but it would send the next person to a stranger's job.
 *
 * The draft ROW is deliberately not deleted, only forgotten by this
 * browser. It may be the only copy of a real person's work, and log out
 * is not a request to destroy anything.
 *
 * Lands on the Jobs home page rather than the login screen: a person who
 * has just logged out is usually finished, not about to log in again as
 * somebody else, and the home page is the only screen that offers both.
 */
export async function logOutOfJobs(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  await clearDraftCandidateId();
  await clearApplyIntent();
  redirect(await jobsPath("/"));
}
