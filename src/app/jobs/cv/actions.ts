"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getDraftCandidateId, setDraftCandidateId } from "@/lib/jobs/draft-session";
import {
  sanitizeFreeText,
  MAX_ROLES,
  type Availability,
  type ExperienceLevel,
  type OccupationPick,
  type StepId,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";
import { AI_POLISH_CAP, polishCvWording } from "@/lib/jobs/ai-polish";
import { writeCvFromFacts, type WriteCvOutput } from "@/lib/jobs/ai-write";
import { AI_WRITE_CAP, EXPERIENCE_LEVEL_OPTIONS, AVAILABILITY_OPTIONS } from "@/lib/jobs/cv-conversation";

export type CvRow = {
  id: string;
  owner_user_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  primary_role_id: string | null;
  secondary_role_ids: string[];
  other_role_text: string | null;
  ofo_occupation_code: string | null;
  secondary_ofo_codes: OccupationPick[];
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  suburb: string | null;
  province: string | null;
  availability: Availability | null;
  skills: string[];
  work_history: WorkHistoryEntry[];
  summary: string | null;
  listed: boolean;
  cv_step: StepId;
  cv_template: string;
  ai_polish_count: number;
  ai_write_count: number;
  ai_recommendations: string[] | null;
};

const CANDIDATE_COLUMNS =
  "id, owner_user_id, full_name, phone, email, primary_role_id, secondary_role_ids, other_role_text, ofo_occupation_code, secondary_ofo_codes, experience_level, years_experience, suburb, province, availability, skills, work_history, summary, listed, cv_step, cv_template, ai_polish_count, ai_write_count, ai_recommendations";

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
 * The import confirmation's "use this" (handoff Job 2): the person has
 * seen and corrected the parsed fields, so they land in their draft in
 * one round trip -- resolve-or-create, then the same sanitised save path
 * as hand-typed answers. The builder resumes at the occupation step,
 * because the official OFO pick is the one thing a parse cannot make for
 * them; everything else arrives pre-filled.
 */
export async function applyImportedCv(patch: CvPatch): Promise<{ id: string } | { error: string }> {
  const existing = await resolveCandidateRow();
  const row = existing ?? (await startDraft());

  const result = await saveCvAnswer(row.id, { ...patch, cv_step: "primary_role" });
  if ("error" in result) return { error: result.error };
  return { id: row.id };
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
  primary_role_id: string | null;
  secondary_role_ids: string[];
  other_role_text: string | null;
  ofo_occupation_code: string | null;
  secondary_ofo_codes: OccupationPick[];
  experience_level: ExperienceLevel;
  years_experience: number;
  suburb: string;
  province: string;
  availability: Availability;
  skills: string[];
  work_history: WorkHistoryEntry[];
  summary: string;
  cv_step: StepId;
  cv_template: string;
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
  if (typeof clean.other_role_text === "string") {
    const r = sanitizeFreeText(clean.other_role_text);
    clean.other_role_text = r.text.slice(0, 80) || null;
    redacted = redacted || r.wasRedacted;
  }
  // Three positions, never more, whatever the client sends: the first
  // choice lives in primary_role_id, so this array holds at most two.
  if (clean.secondary_role_ids) {
    clean.secondary_role_ids = clean.secondary_role_ids.slice(0, MAX_ROLES - 1);
  }
  // Same cap for the OFO model, and never trust a client-sent title: the
  // codes are re-resolved against the official table, so the stored jsonb
  // can only ever hold real occupations with their official titles.
  if (clean.secondary_ofo_codes) {
    const codes = clean.secondary_ofo_codes.map((s) => s.code).slice(0, MAX_ROLES - 1);
    if (codes.length > 0) {
      const { data: official } = await admin
        .from("jobs_ofo_occupations")
        .select("code, title")
        .in("code", codes);
      clean.secondary_ofo_codes = codes
        .map((code) => official?.find((o) => o.code === code))
        .filter((o): o is { code: string; title: string } => !!o);
    } else {
      clean.secondary_ofo_codes = [];
    }
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
    .select("id, suburb, jobs_ofo_occupations(title)")
    .eq("id", candidateId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!row) return { error: "That CV could not be found." };

  const roleLabel = (row.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null;

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

/**
 * The AI wording pass, capped per CV (spec: "Cap regenerations per CV.
 * Never re-run a model to display something already generated"). Applies
 * the polished text straight into the row and stores the recommendations,
 * so displaying them later never costs another call.
 */
export async function polishCv(candidateId: string): Promise<
  | { summary: string | null; workHistory: WorkHistoryEntry[]; recommendations: string[]; remaining: number }
  | { error: string }
> {
  const admin = createAdminClient();
  if (!(await assertOwnership(admin, candidateId))) {
    return { error: "That CV could not be found." };
  }

  const { data: row } = await admin
    .from("jobs_candidates")
    .select("summary, work_history, years_experience, skills, ai_polish_count, jobs_ofo_occupations(title)")
    .eq("id", candidateId)
    .maybeSingle();

  if (!row) return { error: "That CV could not be found." };
  if (row.ai_polish_count >= AI_POLISH_CAP) {
    return { error: "You have used all your wording checks for this CV." };
  }

  const workHistory = (row.work_history ?? []) as WorkHistoryEntry[];
  const hasText = (row.summary ?? "").trim().length > 0 || workHistory.some((w) => (w.description ?? "").trim());
  if (!hasText && workHistory.length === 0) {
    return { error: "Write a summary or add some work history first, then I can help with the wording." };
  }

  const result = await polishCvWording({
    summary: row.summary,
    workHistory,
    roleLabel: (row.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null,
    yearsExperience: row.years_experience,
    hasSkills: (row.skills ?? []).length > 0,
  });

  if (!result) {
    // The attempt still counts against the cap only when it succeeded;
    // a failed call costs the person nothing.
    return { error: "The wording check did not work this time. Please try again in a moment." };
  }

  const polishedHistory = workHistory.map((w, i) => ({ ...w, description: result.workDescriptions[i] ?? w.description }));

  const { error } = await admin
    .from("jobs_candidates")
    .update({
      summary: result.summary ?? row.summary,
      work_history: polishedHistory,
      ai_recommendations: result.recommendations,
      ai_polish_count: row.ai_polish_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (error) {
    console.error("Failed to save polished CV", error);
    return { error: "Could not save the improved wording. Please try again." };
  }

  return {
    summary: result.summary ?? row.summary,
    workHistory: polishedHistory,
    recommendations: result.recommendations,
    remaining: AI_POLISH_CAP - row.ai_polish_count - 1,
  };
}

/**
 * Write with AI (handoff Job 3): drafts the whole CV's prose from the
 * structured facts. NOTHING is applied here -- the draft is stored (so
 * redisplay never re-runs the model) and returned for the person to read,
 * edit and explicitly accept via acceptWrittenCv, or discard. Only a
 * successful generation spends the cap.
 */
export async function writeCv(candidateId: string): Promise<
  { draft: WriteCvOutput; remaining: number } | { error: string }
> {
  const admin = createAdminClient();
  if (!(await assertOwnership(admin, candidateId))) {
    return { error: "That CV could not be found." };
  }

  const { data: row } = await admin
    .from("jobs_candidates")
    .select(
      "summary, work_history, years_experience, experience_level, suburb, province, availability, skills, ai_write_count, ai_written_draft, secondary_ofo_codes, jobs_ofo_occupations(title)",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!row) return { error: "That CV could not be found." };
  if (row.ai_write_count >= AI_WRITE_CAP) {
    // The stored draft is still theirs to reuse; only fresh generations
    // are capped.
    if (row.ai_written_draft) {
      return { draft: row.ai_written_draft as WriteCvOutput, remaining: 0 };
    }
    return { error: "You have used all your AI writing turns for this CV." };
  }

  const primaryTitle = (row.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const roleTitles = [
    ...(primaryTitle ? [primaryTitle] : []),
    ...((row.secondary_ofo_codes ?? []) as { title: string }[]).map((s) => s.title),
  ];

  if (roleTitles.length === 0) {
    return { error: "Pick the work you do first, then I can write your CV from your answers." };
  }

  const workHistory = (row.work_history ?? []) as WorkHistoryEntry[];
  const result = await writeCvFromFacts({
    roleTitles,
    experienceLevelLabel:
      EXPERIENCE_LEVEL_OPTIONS.find((o) => o.id === row.experience_level)?.label ?? null,
    yearsExperience: row.years_experience,
    suburb: row.suburb,
    province: row.province,
    availabilityLabel: AVAILABILITY_OPTIONS.find((a) => a.id === row.availability)?.label ?? null,
    skills: (row.skills ?? []) as string[],
    workHistory,
    typedSummary: row.summary,
  });

  if (!result) {
    return { error: "The writing did not work this time. Please try again in a moment." };
  }

  const { error } = await admin
    .from("jobs_candidates")
    .update({
      ai_written_draft: result,
      ai_write_count: row.ai_write_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
  if (error) {
    console.error("Failed to store written draft", error);
    return { error: "Could not save the draft. Please try again." };
  }

  return { draft: result, remaining: AI_WRITE_CAP - row.ai_write_count - 1 };
}

/**
 * The explicit acceptance step: the person saw the draft, possibly edited
 * it, and chose to use it. The edited text is sanitised exactly like
 * anything typed by hand, and the stored draft is cleared either way
 * (discarding also calls this with apply=false).
 */
export async function acceptWrittenCv(
  candidateId: string,
  accepted: { summary: string; workDescriptions: string[] } | null,
): Promise<{ summary: string | null; workHistory: WorkHistoryEntry[] } | { error: string }> {
  const admin = createAdminClient();
  if (!(await assertOwnership(admin, candidateId))) {
    return { error: "That CV could not be found." };
  }

  const { data: row } = await admin
    .from("jobs_candidates")
    .select("summary, work_history")
    .eq("id", candidateId)
    .maybeSingle();
  if (!row) return { error: "That CV could not be found." };

  const currentHistory = (row.work_history ?? []) as WorkHistoryEntry[];

  if (!accepted) {
    await admin
      .from("jobs_candidates")
      .update({ ai_written_draft: null, updated_at: new Date().toISOString() })
      .eq("id", candidateId);
    return { summary: row.summary, workHistory: currentHistory };
  }

  const cleanSummary = sanitizeFreeText(accepted.summary).text.slice(0, 600);
  const newHistory = currentHistory.map((entry, i) => ({
    ...entry,
    description: sanitizeFreeText(accepted.workDescriptions[i] ?? entry.description ?? "").text.slice(0, 400),
  }));

  const { error } = await admin
    .from("jobs_candidates")
    .update({
      summary: cleanSummary,
      work_history: newHistory,
      ai_written_draft: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
  if (error) {
    console.error("Failed to accept written CV", error);
    return { error: "Could not save that. Please try again." };
  }

  return { summary: cleanSummary, workHistory: newHistory };
}
