"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getDraftCandidateId, setDraftCandidateId } from "@/lib/jobs/draft-session";
import { sanitizeFreeText, type StepId, type WorkHistoryEntry } from "@/lib/jobs/cv-conversation";

export type CvRow = {
  id: string;
  owner_user_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  primary_role_id: string | null;
  years_experience: number | null;
  suburb: string | null;
  province: string | null;
  availability: "immediately" | "within_2_weeks" | "flexible" | null;
  skills: string[];
  work_history: WorkHistoryEntry[];
  summary: string | null;
  listed: boolean;
  cv_step: StepId;
};

const CANDIDATE_COLUMNS =
  "id, owner_user_id, full_name, phone, email, primary_role_id, years_experience, suburb, province, availability, skills, work_history, summary, listed, cv_step";

/**
 * Server-only, read-only: the row this visitor should be editing, if one
 * already exists. Called from src/app/jobs/cv/page.tsx on first render.
 *
 * Deliberately never creates a row or sets a cookie here -- a Server
 * Component render is not allowed to write cookies (Next.js throws
 * "Cookies can only be modified in a Server Action or Route Handler"), and
 * a brand-new anonymous visitor needs both a new row and its cookie set
 * together. That case returns null; the client calls startDraft() below,
 * a real Server Action, to create it.
 */
export async function resolveCandidateRow(): Promise<CvRow | null> {
  const admin = createAdminClient();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: owned } = await admin
      .from("jobs_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("owner_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (owned) return owned as CvRow;
    // A logged-in visitor with no CV yet still goes through startDraft()
    // below (it handles the logged-in case too), so cookie-writing stays
    // confined to that one Server Action.
    return null;
  }

  const draftId = await getDraftCandidateId();
  if (draftId) {
    const { data: draft } = await admin
      .from("jobs_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("id", draftId)
      .is("owner_user_id", null)
      .is("deleted_at", null)
      .maybeSingle();
    if (draft) return draft as CvRow;
    // The cookie named a row that no longer exists or was claimed elsewhere.
  }

  return null;
}

/**
 * Creates the row a brand-new visitor needs, a real Server Action so it's
 * allowed to set the draft cookie. Called from CvBuilder on mount only
 * when resolveCandidateRow() found nothing to resume.
 */
export async function startDraft(): Promise<CvRow> {
  const admin = createAdminClient();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: created, error } = await admin
      .from("jobs_candidates")
      .insert({ owner_user_id: user.id, email: user.email })
      .select(CANDIDATE_COLUMNS)
      .single();
    if (error || !created) throw new Error("Could not start a new CV");
    return created as CvRow;
  }

  const { data: created, error } = await admin
    .from("jobs_candidates")
    .insert({})
    .select(CANDIDATE_COLUMNS)
    .single();
  if (error || !created) throw new Error("Could not start a new CV");
  await setDraftCandidateId(created.id);
  return created as CvRow;
}

/**
 * Whether the current request is allowed to touch this candidate id: either
 * it's the logged-in owner, or it's the unclaimed draft named by this
 * visitor's own cookie. Re-checked on every save, not just on load --
 * calling resolveCandidateRow() once and trusting the id for the rest of
 * the session would let a stale reference outlive a cookie that changed.
 */
async function assertOwnership(admin: ReturnType<typeof createAdminClient>, candidateId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { count } = await admin
      .from("jobs_candidates")
      .select("id", { count: "exact", head: true })
      .eq("id", candidateId)
      .eq("owner_user_id", user.id);
    return (count ?? 0) > 0;
  }

  const draftId = await getDraftCandidateId();
  return draftId === candidateId;
}

export type CvPatch = Partial<{
  full_name: string;
  phone: string;
  primary_role_id: string;
  years_experience: number;
  suburb: string;
  province: string;
  availability: "immediately" | "within_2_weeks" | "flexible";
  skills: string[];
  work_history: WorkHistoryEntry[];
  summary: string;
  cv_step: StepId;
}>;

/**
 * Auto-save after every answer, so closing the tab mid-CV loses nothing --
 * same principle as Growth's intake wizard. Free-text fields (summary, and
 * each work history entry's description) are run through the ID/bank
 * auto-strip before being stored, never after.
 */
export async function saveCvAnswer(candidateId: string, patch: CvPatch): Promise<{ redacted: boolean } | { error: string }> {
  const admin = createAdminClient();
  if (!(await assertOwnership(admin, candidateId))) {
    return { error: "That CV could not be found." };
  }

  let redacted = false;
  const clean: CvPatch = { ...patch };

  if (typeof clean.summary === "string") {
    const r = sanitizeFreeText(clean.summary);
    clean.summary = r.text;
    redacted = redacted || r.wasRedacted;
  }
  if (clean.work_history) {
    clean.work_history = clean.work_history.map((entry) => {
      const r = sanitizeFreeText(entry.description ?? "");
      if (r.wasRedacted) redacted = true;
      return { ...entry, description: r.text };
    });
  }

  const { error } = await admin
    .from("jobs_candidates")
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq("id", candidateId);

  if (error) {
    console.error("Failed to save CV answer", error);
    return { error: "Could not save that. Please try again." };
  }

  return { redacted };
}

/** The review step's "let employers find me" toggle. Requires an account. */
export async function setListed(candidateId: string, listed: boolean): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Save your CV first so employers can reach you." };
  if (!(await assertOwnership(admin, candidateId))) return { error: "That CV could not be found." };

  const { error } = await admin.from("jobs_candidates").update({ listed }).eq("id", candidateId);
  if (error) return { error: "Could not update that. Please try again." };
  return {};
}

/**
 * Spec: "The person's own CV stays in their free account until they
 * delete it. Deletions logged." Split the same way as the WhatsApp inbox
 * (spec's own phrase): the identifying row is genuinely removed, not
 * soft-marked, since "something never held cannot leak" only holds if
 * deleting actually means deleting. What survives is one stripped line
 * with no name, no contact, nothing that identifies the person -- role,
 * area, and when, as demand data.
 *
 * Requires login: an unclaimed anonymous draft has no account to delete
 * from, it's simply an abandoned row nobody claimed.
 */
export async function deleteCv(candidateId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to delete your CV." };

  const { data: row } = await admin
    .from("jobs_candidates")
    .select("id, suburb, jobs_taxonomy!jobs_candidates_primary_role_id_fkey(label)")
    .eq("id", candidateId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!row) return { error: "That CV could not be found." };

  const roleLabel = (row.jobs_taxonomy as unknown as { label: string } | null)?.label ?? null;

  const { error: deleteError } = await admin.from("jobs_candidates").delete().eq("id", candidateId);
  if (deleteError) {
    console.error("Failed to delete jobs_candidates row", deleteError);
    return { error: "Could not delete that. Please try again." };
  }

  await admin.from("jobs_candidate_deletion_log").insert({
    role_label: roleLabel,
    area: row.suburb,
    outcome: "self_deleted",
  });

  return {};
}
