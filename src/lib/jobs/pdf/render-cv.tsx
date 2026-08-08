import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getDraftCandidateId } from "@/lib/jobs/draft-session";
import {
  AVAILABILITY_OPTIONS,
  type CertificationEntry,
  type EducationEntry,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";
import { assembleCv, type CvAssembly } from "@/lib/jobs/cv-assembly";
import { cvFilenameBase } from "@/lib/jobs/cv-format";
import { CvDocument } from "@/lib/jobs/pdf/cv-document";

/**
 * The candidate's own copy of their CV as a PDF, shared by the review
 * step's download link. Mirrors src/lib/bizup/pdf/render-owned.tsx: same
 * "404 rather than 403" posture (this runs with the service role and
 * bypasses RLS, so it never confirms a CV id exists to a visitor who
 * doesn't own it), same ownership re-check rather than trusting the id
 * blindly.
 */
/**
 * Ownership check + data assembly shared by the PDF and Word exports.
 * Returns null (the caller 404s) when the visitor doesn't own the CV or
 * the row is gone -- the same never-confirm-existence posture as before.
 */
export async function loadOwnedCvData(
  candidateId: string,
  /**
   * Render a named, aimed version instead of the base CV. The overlay is
   * the person's own facts rewritten against one advert's words: a
   * different summary, different work descriptions and a different skill
   * order. Everything else, every date, employer and qualification, comes
   * from the same row as always, so a tailored CV cannot drift from the
   * real one.
   */
  tailoredId?: string | null,
): Promise<{ assembly: CvAssembly; templateId: string; filenameBase: string } | null> {
  const admin = createAdminClient();

  const owns = await ownsCandidate(candidateId);
  if (!owns) return null;

  const { data: c } = await admin
    .from("jobs_candidates")
    .select(
      "full_name, phone, email, years_experience, suburb, province, availability, skills, work_history, education, certifications, summary, secondary_ofo_codes, cv_template, deleted_at, jobs_ofo_occupations(title)",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!c || c.deleted_at) return null;

  // Up to three chosen occupations, in the order they were picked (the
  // first is the headline everywhere else too). The primary's official
  // title comes from the join; the secondaries carry theirs in the jsonb.
  const primaryTitle = (c.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const otherRoles = ((c.secondary_ofo_codes ?? []) as { title: string }[]).map((s) => s.title);

  let summary = c.summary as string | null;
  let workHistory = (c.work_history ?? []) as WorkHistoryEntry[];
  let skills = (c.skills ?? []) as string[];

  if (tailoredId) {
    const { data: tailored } = await admin
      .from("jobs_cv_tailored")
      .select("summary, work_descriptions, skills_order")
      .eq("id", tailoredId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (tailored) {
      summary = (tailored.summary as string | null) ?? summary;
      const descriptions = (tailored.work_descriptions ?? []) as string[];
      workHistory = workHistory.map((w, i) => ({ ...w, description: descriptions[i] ?? w.description }));
      const ordered = (tailored.skills_order ?? []) as string[];
      // Belt and braces on top of the filtering the tailor path already
      // does: only skills that are genuinely on the CV can be rendered,
      // whatever is stored in the overlay. A tailored CV may reorder what
      // a person has. It may never add to it.
      if (ordered.length > 0) {
        const owned = new Set(skills.map((s) => s.toLowerCase()));
        const kept = ordered.filter((s) => owned.has(s.toLowerCase()));
        const rest = skills.filter((s) => !kept.some((k) => k.toLowerCase() === s.toLowerCase()));
        skills = [...kept, ...rest];
      }
    }
  }

  const assembly = assembleCv({
    fullName: c.full_name,
    phone: c.phone,
    email: c.email,
    primaryRole: primaryTitle ?? null,
    otherRoles,
    yearsExperience: c.years_experience,
    suburb: c.suburb,
    province: c.province,
    availabilityLabel: AVAILABILITY_OPTIONS.find((a) => a.id === c.availability)?.label ?? null,
    // Skills are stored as display labels since the OFO switch.
    skills,
    workHistory,
    education: (c.education ?? []) as EducationEntry[],
    certifications: (c.certifications ?? []) as CertificationEntry[],
    summary,
  });

  return {
    assembly,
    templateId: c.cv_template,
    // Firstname-Surname-CV, never a database id. An employer used to
    // receive a file named after a uuid.
    filenameBase: cvFilenameBase(c.full_name),
  };
}

export async function renderCvPdf(candidateId: string, tailoredId?: string | null): Promise<Response> {
  const loaded = await loadOwnedCvData(candidateId, tailoredId);
  if (!loaded) return new Response("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    <CvDocument a={loaded.assembly} templateId={loaded.templateId} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${loaded.filenameBase}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

/**
 * Who may download this CV.
 *
 * The person themselves, always. And, since 9 August 2026, an employer the
 * person has actually applied to: Dewald, walking the employer side, "I can
 * see I have 1 applicant but I can't read the CV or download it? There has
 * to be a way to do that." He is right, and an employer who cannot get the
 * CV out of the system will ask the candidate to email it, which puts the
 * document somewhere nobody can log or withdraw.
 *
 * The gate is a real application row, not merely being an employer: an
 * employer can download the CV of somebody who applied to them, and nobody
 * else's. Applying is the consent, exactly as it is for the on-screen
 * applicant view, and the download is logged the same way that view is.
 */
async function ownsCandidate(candidateId: string): Promise<boolean> {
  const admin = createAdminClient();
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
    if ((count ?? 0) > 0) return true;

    const { data: employer } = await admin
      .from("jobs_employers")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (employer) {
      const { count: applications } = await admin
        .from("jobs_applications")
        .select("id", { count: "exact", head: true })
        .eq("employer_id", employer.id)
        .eq("candidate_id", candidateId);

      if ((applications ?? 0) > 0) {
        // Logged before the bytes go out, same rule as the on-screen view:
        // a download that fails after this point must still be counted.
        await admin
          .from("jobs_record_views")
          .insert({ employer_id: employer.id, candidate_id: candidateId });
        return true;
      }
    }

    return false;
  }

  const draftId = await getDraftCandidateId();
  return draftId === candidateId;
}
