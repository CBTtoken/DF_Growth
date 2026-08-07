"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { initializeJobsSubscription, type JobsPaidPlan } from "@/lib/jobs/billing";
import { isJobsHost, JOBS_PREFIX } from "@/lib/jobs/host";

// The bizup upgrade action shape: the account is re-read server-side,
// never trusted from the form, and the callback URL is host-aware so the
// Paystack return lands on whichever hostname the member started from.

async function callbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "jobs.katisobiz.co.za";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const prefix = isJobsHost(host) ? "" : JOBS_PREFIX;
  return `${proto}://${host}${prefix}/employer/upgrade/done`;
}

export async function startJobsUpgrade(formData: FormData): Promise<void> {
  const employer = await getMyJobsEmployer();
  if (!employer) redirect("/employers");

  // A paying member never needs the paid tiers; the page hides the
  // buttons, and this guard holds when someone posts the form anyway.
  if (employer.entitlement.source === "member") {
    redirect("./upgrade?already=1");
  }

  const plan: JobsPaidPlan = String(formData.get("plan")) === "unlimited" ? "unlimited" : "starter";

  const result = await initializeJobsSubscription({
    employerId: employer.id,
    email: employer.email,
    plan,
    callbackUrl: await callbackUrl(),
  });

  if ("error" in result) {
    redirect("./upgrade?error=1");
  }
  redirect(result.authorizationUrl);
}
