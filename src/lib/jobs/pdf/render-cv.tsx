import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getDraftCandidateId } from "@/lib/jobs/draft-session";
import { AVAILABILITY_OPTIONS, type WorkHistoryEntry } from "@/lib/jobs/cv-conversation";
import { CvDocument, type CvPdfData } from "@/lib/jobs/pdf/cv-document";

/**
 * The candidate's own copy of their CV as a PDF, shared by the review
 * step's download link. Mirrors src/lib/bizup/pdf/render-owned.tsx: same
 * "404 rather than 403" posture (this runs with the service role and
 * bypasses RLS, so it never confirms a CV id exists to a visitor who
 * doesn't own it), same ownership re-check rather than trusting the id
 * blindly.
 */
export async function renderCvPdf(candidateId: string): Promise<Response> {
  const admin = createAdminClient();

  const owns = await ownsCandidate(candidateId);
  if (!owns) return new Response("Not found", { status: 404 });

  const { data: c } = await admin
    .from("jobs_candidates")
    .select(
      "full_name, phone, email, years_experience, suburb, province, availability, skills, work_history, summary, secondary_ofo_codes, cv_template, deleted_at, jobs_ofo_occupations(title)",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!c || c.deleted_at) return new Response("Not found", { status: 404 });

  // Up to three chosen occupations, in the order they were picked (the
  // first is the headline everywhere else too). The primary's official
  // title comes from the join; the secondaries carry theirs in the jsonb.
  const primaryTitle = (c.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const roleLabels = [
    ...(primaryTitle ? [primaryTitle] : []),
    ...((c.secondary_ofo_codes ?? []) as { title: string }[]).map((s) => s.title),
  ];

  const data: CvPdfData = {
    fullName: c.full_name || "My CV",
    phone: c.phone,
    email: c.email,
    roleLine: roleLabels.length ? roleLabels.join(", ") : null,
    yearsExperience: c.years_experience,
    suburb: c.suburb,
    province: c.province,
    availabilityLabel: AVAILABILITY_OPTIONS.find((a) => a.id === c.availability)?.label ?? null,
    // Skills are stored as display labels since the OFO switch.
    skillLabels: (c.skills ?? []) as string[],
    workHistory: (c.work_history ?? []) as WorkHistoryEntry[],
    summary: c.summary,
  };

  const buffer = await renderToBuffer(<CvDocument data={data} templateId={c.cv_template} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(c.full_name || "cv").replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

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
    return (count ?? 0) > 0;
  }

  const draftId = await getDraftCandidateId();
  return draftId === candidateId;
}
