"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { MESSAGE_MAX, sendMessageAlert } from "@/lib/jobs/messages";

/**
 * The seeker's half of an application: pulling out, and replying.
 *
 * Both are scoped through the candidate row this login owns, so a form can
 * name any application id and the write only ever lands on their own.
 */

async function myApplication(applicationId: string) {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select("id, full_name")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!candidate) return null;

  const { data: application } = await admin
    .from("jobs_applications")
    .select("id, status, vacancy_title, employer_id, jobs_employers(business_name, email)")
    .eq("id", applicationId)
    .eq("candidate_id", candidate.id)
    .maybeSingle();
  if (!application) return null;

  return { application, candidate };
}

/**
 * Withdrawing. Dewald: "When they applied for a job, they should be able to
 * change the status, cancel it."
 *
 * Its own status rather than reusing 'declined', because who ended it
 * matters to both sides: an employer looking at a list needs to see that
 * this person pulled out, not that the employer turned them down. The row
 * is kept, not deleted, so the employer is not left wondering where an
 * applicant went, and so the seeker's own history stays honest.
 */
export async function withdrawApplication(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const found = await myApplication(applicationId);
  if (!found) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_applications")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", found.application.id);
  if (error) console.error("Failed to withdraw application", error);

  revalidatePath("/jobs/dashboard");
  revalidatePath(`/jobs/dashboard/applications/${applicationId}`);
}

/** Changed their mind again. Back to the front of the pipe, honestly. */
export async function reapplyApplication(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const found = await myApplication(applicationId);
  if (!found || found.application.status !== "withdrawn") return;

  const admin = createAdminClient();
  await admin
    .from("jobs_applications")
    .update({ status: "new", updated_at: new Date().toISOString() })
    .eq("id", found.application.id);

  revalidatePath("/jobs/dashboard");
  revalidatePath(`/jobs/dashboard/applications/${applicationId}`);
}

/**
 * The seeker replying. Dewald: "on general message seeker should be able to
 * respond."
 */
export async function sendCandidateMessage(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const raw = String(formData.get("body") ?? "").trim().slice(0, MESSAGE_MAX);
  if (!raw) return;

  const found = await myApplication(applicationId);
  if (!found) return;

  const body = sanitizeFreeText(raw).text;
  const admin = createAdminClient();

  const { data: created, error } = await admin
    .from("jobs_application_messages")
    .insert({ application_id: applicationId, sender_role: "candidate", body })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to send candidate message", error);
    return;
  }

  const employer = found.application.jobs_employers as unknown as {
    business_name: string;
    email: string | null;
  } | null;

  if (created?.id && employer?.email) {
    const alert = await sendMessageAlert({
      to: employer.email,
      toName: employer.business_name,
      fromName: found.candidate.full_name ?? "An applicant",
      vacancyTitle: found.application.vacancy_title,
      body,
      forRole: "employer",
      applicationId,
    });
    if (alert.ok) {
      await admin
        .from("jobs_application_messages")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", created.id);
    }
  }

  revalidatePath(`/jobs/dashboard/applications/${applicationId}`);
}
