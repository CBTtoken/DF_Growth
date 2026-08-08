// One assembly, five templates, two file formats.
//
// The handoff, Job 3: "PDF and Word are generated from the same data
// assembly for all five, the way the existing Word export already reuses
// loadOwnedCvData." This file IS that assembly. It takes the raw stored
// row and returns the finished, formatted, section-by-section document
// that both renderers walk. A template chooses order and styling; it never
// decides content, and it cannot drop a section by accident because it
// never sees the raw data at all.
//
// Everything arriving here is already the person's own words. Everything
// leaving here is those same words, cased, dated, spaced and punctuated
// consistently (lib/jobs/cv-format.ts). Not one word of meaning changes.

import {
  cleanText,
  formatDateRange,
  formatEmail,
  formatMonthYear,
  formatPhone,
  titleCase,
  toBullets,
  formatBullet,
} from "@/lib/jobs/cv-format";
import {
  splitSkills,
  type CertificationEntry,
  type EducationEntry,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";

/** Standard section headings only. Never a creative heading. */
export const SECTION_HEADINGS = {
  summary: "Professional summary",
  work: "Work experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
} as const;

export interface CvHeader {
  fullName: string;
  /** The headline occupation. What the six second scan reads first. */
  headline: string | null;
  otherRoles: string[];
  yearsLine: string | null;
  area: string | null;
  phone: string | null;
  email: string | null;
  availability: string | null;
  /** Up to three, in the header block, because the scan looks for them there. */
  topSkills: string[];
}

export interface CvWorkBlock {
  role: string;
  employer: string;
  dates: string;
  bullets: string[];
}

export interface CvFit {
  /** Rough line count at the normal density, used to pick a density. */
  estimatedLines: number;
  /** Still over two pages at the tightest density we will go to. */
  overflowing: boolean;
  /** Scales type and leading. 1 is normal; nothing ever goes below 10pt body. */
  density: number;
  /**
   * The section with the most lines in it, named in plain words, so the
   * person can be told which one to shorten. Never cut silently.
   */
  longestSection: string | null;
}

export interface CvAssembly {
  header: CvHeader;
  summary: string | null;
  work: CvWorkBlock[];
  practicalSkills: string[];
  workingSkills: string[];
  education: string[];
  certifications: string[];
  fit: CvFit;
}

/** What the assembly needs, however the caller got hold of it. */
export interface CvSourceData {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  primaryRole: string | null;
  otherRoles: string[];
  yearsExperience: number | null;
  suburb: string | null;
  province: string | null;
  availabilityLabel: string | null;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  summary: string | null;
}

// A4 at 10pt with 0.5-1in margins holds roughly 46 body lines per page,
// measured against the existing Clean template rather than guessed. Two
// pages is the hard ceiling the handoff sets.
const LINES_PER_PAGE = 46;
const MAX_PAGES = 2;
const CHARS_PER_LINE = 92;

function linesFor(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
}

/**
 * Build a work entry's bullets.
 *
 * The description supplies the action bullets. The impact facts, if the
 * person gave any, become their own bullets and go FIRST, because they are
 * what the six second scan is looking for and burying them under a duty
 * list defeats the point of having asked.
 */
function bulletsFor(entry: WorkHistoryEntry): string[] {
  const impacts = (entry.impacts ?? [])
    .map((i) => formatBullet(i))
    .filter(Boolean);
  const duties = toBullets(entry.description);
  return [...impacts, ...duties];
}

function educationLine(e: EducationEntry): string {
  const qualification = titleCase(e.qualification);
  if (!qualification) return "";
  const institution = titleCase(e.institution);
  const year = formatMonthYear(e.year);
  // "not completed" rather than dropping it: a part-finished matric is
  // real experience and hiding it would be us editing their history.
  const status = e.completed === false ? "not completed" : "";
  return [qualification, institution, year, status].filter(Boolean).join(", ");
}

function certificationLine(c: CertificationEntry): string {
  const name = titleCase(c.name);
  if (!name) return "";
  return [name, titleCase(c.issuer), formatMonthYear(c.year)].filter(Boolean).join(", ");
}

/**
 * Everything the five templates render, formatted and ready. Empty
 * sections come back empty and the templates skip them, which is how the
 * "no heading with nothing under it, ever" rule is kept in one place
 * rather than in five.
 */
export function assembleCv(source: CvSourceData): CvAssembly {
  const { practical, working } = splitSkills(source.skills ?? []);

  const work: CvWorkBlock[] = (source.workHistory ?? [])
    .map((entry) => ({
      role: titleCase(entry.role),
      employer: titleCase(entry.employer),
      dates: formatDateRange(entry.start, entry.end, entry.current),
      bullets: bulletsFor(entry),
    }))
    // An entry with no role and no employer is an empty row somebody
    // added and abandoned. It would render as a floating date.
    .filter((w) => w.role || w.employer);

  const education = (source.education ?? []).map(educationLine).filter(Boolean);
  const certifications = (source.certifications ?? []).map(certificationLine).filter(Boolean);

  const area = [titleCase(source.suburb), titleCase(source.province)].filter(Boolean).join(", ");

  const header: CvHeader = {
    fullName: titleCase(source.fullName) || "My CV",
    headline: titleCase(source.primaryRole) || null,
    otherRoles: (source.otherRoles ?? []).map((r) => titleCase(r)).filter(Boolean),
    yearsLine:
      source.yearsExperience != null
        ? `${source.yearsExperience} ${source.yearsExperience === 1 ? "year" : "years"}' experience`
        : null,
    area: area || null,
    phone: formatPhone(source.phone) || null,
    email: formatEmail(source.email) || null,
    availability: cleanText(source.availabilityLabel) || null,
    // The practical ones lead, because they are what an employer scans
    // for. A person with only working skills still gets three.
    topSkills: [...practical, ...working].slice(0, 3),
  };

  // The summary is left as the person wrote it, including a long unbroken
  // pasted paragraph: the handoff is explicit that those are left alone
  // here and flagged by the CV check instead.
  const summary = cleanText(source.summary) || null;

  const assembly: CvAssembly = {
    header,
    summary,
    work,
    practicalSkills: practical,
    workingSkills: working,
    education,
    certifications,
    fit: { estimatedLines: 0, overflowing: false, density: 1, longestSection: null },
  };

  assembly.fit = measureFit(assembly);
  return assembly;
}

/**
 * Two-page enforcement. "If content overflows, tighten spacing first, then
 * tell the person which section is longest and offer to shorten it. Never
 * silently cut."
 *
 * So this returns a density to render at and a diagnosis, and the
 * renderers never truncate anything. A CV that will not fit at the
 * tightest density still renders in full, on however many pages it takes,
 * with `overflowing` set so the review screen can say which section to
 * shorten. A CV cut short without being told is a person walking into an
 * interview missing a job they did.
 */
export function measureFit(a: CvAssembly): CvFit {
  const headerLines = 6;

  const sectionLines: Record<string, number> = {
    [SECTION_HEADINGS.summary]: a.summary ? 1 + linesFor(a.summary) : 0,
    [SECTION_HEADINGS.work]: a.work.length
      ? 1 + a.work.reduce((n, w) => n + 2 + w.bullets.reduce((m, b) => m + linesFor(b), 0), 0)
      : 0,
    [SECTION_HEADINGS.skills]:
      a.practicalSkills.length || a.workingSkills.length
        ? 1 +
          (a.practicalSkills.length ? 1 + linesFor(a.practicalSkills.join(", ")) : 0) +
          (a.workingSkills.length ? 1 + linesFor(a.workingSkills.join(", ")) : 0)
        : 0,
    [SECTION_HEADINGS.education]: a.education.length ? 1 + a.education.length : 0,
    [SECTION_HEADINGS.certifications]: a.certifications.length ? 1 + a.certifications.length : 0,
  };

  const estimatedLines = headerLines + Object.values(sectionLines).reduce((n, v) => n + v, 0);
  const capacity = LINES_PER_PAGE * MAX_PAGES;

  // Tighten spacing first, and only as far as 10pt body text: below that
  // it stops being a CV somebody can read on a printed page in an office.
  const MIN_DENSITY = 0.84;
  const density = estimatedLines <= capacity ? 1 : Math.max(MIN_DENSITY, capacity / estimatedLines);

  const longest = Object.entries(sectionLines)
    .filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1])[0];

  return {
    estimatedLines,
    overflowing: estimatedLines * MIN_DENSITY > capacity,
    density,
    longestSection: longest ? longest[0] : null,
  };
}
