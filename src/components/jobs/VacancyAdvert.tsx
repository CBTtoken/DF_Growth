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

/**
 * Turning what an employer typed into something readable.
 *
 * Dewald, 9 August: "The display does not look very well on current jobs,
 * it can be better structured, nice clean bold headings, clear bullet
 * points."
 *
 * Employers type these sections as lists, because that is what duties and
 * requirements are, but they type them however they like: one per line,
 * with dashes, with bullets, or numbered. The old render put the whole
 * thing in one paragraph with `whitespace-pre-line`, so a five-item list
 * of duties arrived as a grey wall.
 *
 * So: split on newlines, strip whatever list marker they used, and render
 * real bullets. A single line with no breaks is left as a paragraph, which
 * is what it is. Nothing is invented and no text is dropped, only marked up.
 */
// The leading marker an employer may have typed: hyphen, asterisk, bullet,
// middle dot, one of the two long dashes, or "1." / "1)".
//
// The two long dashes are built from char codes rather than written into
// the pattern. scripts/check-house-style.mjs rejects a long dash in source
// whether it is literal or escaped, deliberately, so that nobody smuggles
// one into customer copy. This line strips such a character out of an
// employer's typing rather than printing one, which is the opposite
// intent, and fromCharCode is the honest way to say so.
const LONG_DASHES = String.fromCharCode(0x2013, 0x2014);
const LIST_MARKER = new RegExp(`^\\s*(?:[-*\\u2022\\u00b7${LONG_DASHES}]|\\d+[.)])\\s*`);

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(LIST_MARKER, "").trim())
    .filter(Boolean);
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text?.trim()) return null;

  const lines = toLines(text);
  const asList = lines.length > 1;

  return (
    <section className="mt-7">
      <h2 className="text-base font-extrabold text-neutral-ink">{title}</h2>
      {asList ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-neutral-800">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 whitespace-pre-line text-neutral-800">{lines[0] ?? text}</p>
      )}
    </section>
  );
}

/** One fact about the job, in the summary strip under the title. */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-neutral-ink">{value}</dd>
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
    <article>
      {/* The five-second read: what the job is, who it is with, where. */}
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink">{v.title}</h1>
      <p className="mt-2 text-lg font-semibold text-neutral-700">{v.employerName}</p>
      <p className="mt-1 text-neutral-600">
        {v.suburb}, {v.province}
      </p>

      {/* Everything an applicant decides on, in one scannable block rather
          than three runs of middle dots. */}
      <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:grid-cols-3">
        <Fact label="Type of work" value={EMPLOYMENT_TYPE_LABELS[v.employmentType] ?? null} />
        <Fact label="Level" value={experienceLevelLabel(v.experienceLevel)} />
        <Fact label="Field" value={v.roleTitle} />
        <Fact label="Starts" value={v.startsText} />
        <Fact label="Apply by" value={closing} />
        <Fact label="Pay" value={showPay ? v.payText : null} />
      </dl>

      {v.duties ? (
        <>
          <Section title="What you would be doing" text={v.duties} />
          <Section title="You must have" text={v.mustHave} />
          <Section title="Nice to have" text={v.niceToHave} />
          <Section title="Qualifications" text={v.qualifications} />
          <Section title="How they choose" text={v.selectionProcess} />
        </>
      ) : (
        // Rows created before the structured form carry one description.
        // Run through the same list detection, so an old post typed as a
        // list reads as one too.
        <Section title="About this job" text={v.description} />
      )}
    </article>
  );
}
