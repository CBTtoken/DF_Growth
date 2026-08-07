"use server";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { jobsPath } from "@/lib/jobs/host";

/**
 * Logging out of Jobs.
 *
 * This did not exist anywhere in the product until now, on either side.
 * A job seeker is very often on a shared or borrowed phone, which makes a
 * missing log out worse here than on any other product in this estate: the
 * next person to open the browser was landing in somebody else's CV, with
 * their name and mobile number on the screen.
 *
 * Lands on the Jobs home page rather than the login screen: a person who
 * has just logged out is usually finished, not about to log in again as
 * somebody else, and the home page is the only screen that offers both.
 */
export async function logOutOfJobs(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect(await jobsPath("/"));
}
