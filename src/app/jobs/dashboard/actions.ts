"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function myCandidateId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

/** Availability straight from the dashboard, no trip back into the builder. */
export async function updateAvailability(formData: FormData): Promise<void> {
  const availability = String(formData.get("availability") ?? "");
  if (!["immediately", "within_2_weeks", "one_month_notice", "flexible"].includes(availability)) return;

  const candidateId = await myCandidateId();
  if (!candidateId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_candidates")
    .update({ availability, updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) console.error("Failed to update availability", error);
  revalidatePath("/jobs/dashboard");
}

/** The "employers can find me" switch, the dashboard's listing control. */
export async function toggleListed(formData: FormData): Promise<void> {
  const listed = String(formData.get("listed")) === "true";

  const candidateId = await myCandidateId();
  if (!candidateId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_candidates")
    .update({ listed, updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) console.error("Failed to update listed", error);
  revalidatePath("/jobs/dashboard");
}
