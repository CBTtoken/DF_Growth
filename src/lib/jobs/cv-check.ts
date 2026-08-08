// The CV check. Handoff Job 2.
//
// Replaces the bare completeness percentage with a checklist that tells
// the person what to fix and takes them straight there. A percentage told
// somebody they were 70% done and nothing about which 30% mattered.
//
// THE RULE THAT GOVERNS THIS WHOLE FILE, from the handoff:
//
//   "This checks a document, not a person. It is never shown to an
//    employer, never stored on the candidate record for search, and never
//    used to rank or order anyone. Alerts not scores, portfolio rule."
//
// So: computed on read, never written to a column, and never imported by
// anything under the employer side. If a future sprint wants to sort
// candidates, it must not reach for this. A document-quality score used
// to order people is a score about the person, whatever it is called, and
// it would quietly penalise everybody who is least confident writing
// about themselves. That is the exact person this product is for.

import type { StepId } from "@/lib/jobs/cv-conversation";
import type { CvAssembly } from "@/lib/jobs/cv-assembly";
import type { CertificationEntry, EducationEntry, WorkHistoryEntry } from "@/lib/jobs/cv-conversation";

export interface CvCheckItem {
  id: string;
  /** Encouraging and specific. Never the word "incomplete". */
  message: string;
  done: boolean;
  /** The exact screen that fixes it, opened by tapping the item. */
  step: StepId;
}

export interface CvCheckInput {
  fullName: string | null;
  phone: string | null;
  primaryRole: string | null;
  suburb: string | null;
  province: string | null;
  summary: string | null;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  /** From the assembly, so the two-page verdict is the renderer's own. */
  assembly?: CvAssembly | null;
}

/**
 * A South African phone number we could actually ring. Ten digits
 * starting with a zero, or the +27 form of the same thing.
 *
 * Note for anyone extending this: never run a phone field through
 * sanitizeFreeText. That strips any run of 9 to 16 digits as a suspected
 * ID or bank number, and a phone number is exactly that shape.
 */
function phoneLooksReal(phone: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return true;
  if (digits.length === 11 && digits.startsWith("27")) return true;
  if (digits.length === 13 && digits.startsWith("0027")) return true;
  return false;
}

/** Three to four sentences is the ask. Two is thin, six is a wall. */
function summarySentenceCount(summary: string | null): number {
  if (!summary?.trim()) return 0;
  return (summary.match(/[.!?](?:\s|$)/g) ?? []).length || 1;
}

/** The first employer's name, so the advice can name their actual job. */
function firstEmployerName(workHistory: WorkHistoryEntry[]): string | null {
  const named = workHistory.find((w) => w.employer?.trim());
  return named?.employer?.trim() ?? null;
}

function hasNumberSomewhere(workHistory: WorkHistoryEntry[]): boolean {
  return workHistory.some(
    (w) =>
      (w.impacts ?? []).some((i) => /\d/.test(i ?? "")) || /\d/.test(w.description ?? ""),
  );
}

/**
 * The checklist. Every item is a document fact, phrased as the next thing
 * to do rather than as a deficiency, and carries the step that fixes it.
 */
export function runCvCheck(input: CvCheckInput): CvCheckItem[] {
  const employer = firstEmployerName(input.workHistory);
  const sentences = summarySentenceCount(input.summary);
  const datedEntries = input.workHistory.filter(
    (w) => w.start?.trim() && (w.current || w.end?.trim()),
  );

  const items: CvCheckItem[] = [
    {
      id: "name",
      done: !!input.fullName?.trim(),
      message: input.fullName?.trim()
        ? "Your name is on your CV"
        : "Add your name, so an employer knows whose CV they are reading",
      step: "name",
    },
    {
      id: "phone",
      done: phoneLooksReal(input.phone),
      message: phoneLooksReal(input.phone)
        ? "Your number looks right"
        : "Check your phone number. If an employer cannot ring you, nothing else on here matters",
      step: "phone",
    },
    {
      id: "headline",
      done: !!input.primaryRole?.trim(),
      message: input.primaryRole?.trim()
        ? `Employers can see you are ${aOrAn(input.primaryRole.trim())}`
        : "Choose the work you do. It is the first thing an employer looks for",
      step: "primary_role",
    },
    {
      id: "location",
      done: !!input.suburb?.trim() && !!input.province?.trim(),
      message:
        input.suburb?.trim() && input.province?.trim()
          ? "Your area is on your CV"
          : "Add your suburb and province, so employers nearby can find you",
      step: "location",
    },
    {
      id: "summary",
      done: sentences >= 3 && sentences <= 5,
      message:
        sentences === 0
          ? "Write two or three lines about yourself. This is the first thing that gets read"
          : sentences < 3
            ? "Your summary is short. Three or four sentences gives an employer something to go on"
            : sentences > 5
              ? "Your summary is long. Three or four sentences is what gets read in the first few seconds"
              : "Your summary is a good length",
      step: "summary",
    },
    {
      id: "work",
      done: input.workHistory.length > 0,
      message:
        input.workHistory.length > 0
          ? `You have ${input.workHistory.length} ${input.workHistory.length === 1 ? "job" : "jobs"} on your CV`
          : "Add a job you have done. Even one shows an employer what you have handled",
      step: "work_history",
    },
    {
      id: "dates",
      done: input.workHistory.length === 0 || datedEntries.length === input.workHistory.length,
      message:
        input.workHistory.length === 0 || datedEntries.length === input.workHistory.length
          ? "Every job has its dates"
          : "One of your jobs is missing its dates. Employers read the dates to see how you have moved on",
      step: "work_history",
    },
    {
      id: "numbers",
      done: hasNumberSomewhere(input.workHistory),
      message: hasNumberSomewhere(input.workHistory)
        ? "Your CV has numbers on it, which is what employers look for"
        : employer
          ? `Add one number to your ${employer} job and employers can see what you handled`
          : "Add a number to one of your jobs. How many people, how much, how often",
      step: "work_history",
    },
    {
      id: "skills",
      done: input.skills.length > 0,
      message:
        input.skills.length > 0
          ? `You have listed ${input.skills.length} ${input.skills.length === 1 ? "skill" : "skills"}`
          : "Add what you can do. Employers search on these",
      step: "skills",
    },
    {
      id: "education",
      done: input.education.length > 0 || input.certifications.length > 0,
      message:
        input.education.length > 0 || input.certifications.length > 0
          ? "Your schooling and tickets are on your CV"
          : "Add your schooling, or any ticket or licence you hold. Whatever you finished counts",
      step: "education",
    },
  ];

  // Two-page fit, from the renderer's own measurement rather than a
  // second guess at it. Only shown once there is a CV to overflow.
  if (input.assembly) {
    const { overflowing, longestSection } = input.assembly.fit;
    items.push({
      id: "length",
      done: !overflowing,
      message: overflowing
        ? `Your CV runs past two pages. ${longestSection ?? "Work experience"} is the longest part, so that is the place to shorten`
        : "Your CV fits on two pages",
      step: "review",
    });
  }

  return items;
}

function aOrAn(role: string): string {
  return `${/^[aeiou]/i.test(role) ? "an" : "a"} ${role.toLowerCase()}`;
}

/** How many are still outstanding. Used for the one-line dashboard prompt. */
export function outstandingCount(items: CvCheckItem[]): number {
  return items.filter((i) => !i.done).length;
}
