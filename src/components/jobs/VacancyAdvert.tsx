import { experienceLevelLabel } from "@/lib/jobs/cv-conversation";

// The advert body, shared verbatim by the public vacancy page and the
// employer's pre-publish preview -- one component is what makes "the
// employer sees the advert as an applicant will see it" (handoff Job 6)
// true by construction rather than by imitation.

export type VacancyAdvertData = {
  title: string;
  employerName: string | null;
  roleTitle: string | null;
  experienceLevel: string | null;
  employmentType: string;
  suburb: string;
  province: string;
  startsText: string | null;
  closingDate: string | null;
  duties: string | null;
  mustHave: string | null;
  niceToHave: string | null;
  qualifications: string | null;
  selectionProcess: string | null;
  payText: string | null;
  salaryPublic: boolean;
  /** Pre-structure rows only have this. */
  description: string | null;
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Permanent",
  part_time: "Part time",
  contract: "Contract",
  temp: "Temporary",
};

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
      <p className="mt-1 whitespace-pre-line text-neutral-800">{text}</p>
    </div>
  );
}

export function VacancyAdvert({ v }: { v: VacancyAdvertData }) {
  const showPay = v.salaryPublic && v.payText;
  const closing = v.closingDate
    ? new Date(`${v.closingDate}T00:00:00`).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{v.title}</h1>
      <p className="mt-1 text-neutral-600">
        {[
          v.employerName,
          v.roleTitle,
          experienceLevelLabel(v.experienceLevel),
          EMPLOYMENT_TYPE_LABELS[v.employmentType],
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-1 text-neutral-600">
        {v.suburb}, {v.province}
        {showPay ? ` · ${v.payText}` : ""}
      </p>
      {(v.startsText || closing) && (
        <p className="mt-1 text-sm text-neutral-500">
          {[v.startsText ? `Starts: ${v.startsText}` : null, closing ? `Apply by ${closing}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {v.duties ? (
        <>
          <Section title="Duties and responsibilities" text={v.duties} />
          <Section title="You must have" text={v.mustHave} />
          <Section title="Nice to have" text={v.niceToHave} />
          <Section title="Qualifications" text={v.qualifications} />
          <Section title="How selection works" text={v.selectionProcess} />
        </>
      ) : (
        // Rows created before the structured form carry one description.
        <div className="mt-6 whitespace-pre-line text-neutral-800">{v.description}</div>
      )}
    </div>
  );
}
