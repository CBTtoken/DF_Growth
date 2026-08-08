// The CV builder's question sequence and branching, shaped like
// src/lib/whatsapp/conversation.ts's own StepId + current_step/step_data
// state machine -- but adapted for a web UI rather than a stateless
// webhook handler. WhatsApp has no client state between messages, so that
// file's advanceConversation() re-derives everything from a DB row on
// every incoming text. Here the browser already holds live React state
// (src/components/jobs/CvBuilder.tsx's useReducer), so this file owns only
// the two genuinely shared, reusable pieces: the fixed step order
// (including its one branch, work history's "add another?" loop) and the
// pure validation/sanitisation logic. The server side
// (src/app/jobs/cv/actions.ts) just persists whatever step the client says
// it has reached.
//
// Photo is deliberately not a step this sprint: jobs_candidates.photo_path
// exists in the schema, but nothing reads it yet -- the anonymous browse
// layer never shows a photo at all (spec), and a logged-in employer's full
// record view doesn't exist until Sprint 2. Building upload/downscale
// handling for a field with no consumer would be pure waste; it becomes a
// step the day something actually displays it.

export type StepId =
  | "name"
  | "phone"
  | "primary_role"
  | "years_experience"
  | "experience_level"
  | "location"
  | "availability"
  | "skills"
  | "work_history"
  | "education"
  | "certifications"
  | "summary"
  | "review";

export const STEP_ORDER: StepId[] = [
  "name",
  "phone",
  "primary_role",
  "years_experience",
  "experience_level",
  "location",
  "availability",
  "skills",
  "work_history",
  // Education and certifications did not exist in this product until the
  // CV quality sprint, and the handoff assumes they do: Job 2's checklist
  // wants "education present", Job 3 lists both among the five standard
  // headings, and the Trades template is built entirely around putting
  // tickets and licences above work experience. Both are optional and
  // both skip in one tap, so the wizard stays the short thing it was for
  // anyone who has neither.
  "education",
  "certifications",
  "summary",
  "review",
];

export function nextStep(current: StepId): StepId {
  const i = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
}

export function previousStep(current: StepId): StepId {
  const i = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.max(i - 1, 0)];
}

export function stepIndex(current: StepId): number {
  return STEP_ORDER.indexOf(current);
}

export type Availability = "immediately" | "within_2_weeks" | "one_month_notice" | "flexible";

export const AVAILABILITY_OPTIONS: { id: Availability; label: string }[] = [
  { id: "immediately", label: "Immediately" },
  { id: "within_2_weeks", label: "Within two weeks" },
  // Dewald, 7 August walkthrough: "many have to give a 1 month's notice."
  // The most common real answer for anyone currently employed.
  { id: "one_month_notice", label: "One month's notice" },
  { id: "flexible", label: "I can be flexible" },
];

/**
 * Experience level, separate from occupation and from years (handoff Job 1):
 * a single choice, the same five values on both the CV and every vacancy.
 */
export type ExperienceLevel =
  | "new_starter"
  | "experienced"
  | "senior"
  | "management"
  | "executive";

export const EXPERIENCE_LEVEL_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: "new_starter", label: "New starter" },
  { id: "experienced", label: "Experienced" },
  { id: "senior", label: "Senior" },
  { id: "management", label: "Management" },
  { id: "executive", label: "Executive" },
];

export function experienceLevelLabel(id: string | null | undefined): string | null {
  return EXPERIENCE_LEVEL_OPTIONS.find((o) => o.id === id)?.label ?? null;
}

/**
 * An OFO pick as the client holds it: the 6-digit code plus the official
 * title, carried together so every screen can render the title without a
 * lookup round trip. The code alone is what matching ever uses.
 */
export type OccupationPick = { code: string; title: string };

/** Up to three positions per candidate: the first is the headline. */
export const MAX_ROLES = 3;

/**
 * Wording checks per CV. Lives here rather than in lib/jobs/ai-polish.ts
 * because the review screen needs the number too, and importing it from
 * there would pull the Anthropic SDK into the client bundle.
 */
export const AI_POLISH_CAP = 3;

/**
 * Free Write with AI turns, PER PERSON rather than per CV (Dewald,
 * 8 August 2026). Down from three, and the change of unit matters more
 * than the change of number: a per-CV allowance resets the moment
 * somebody starts a second CV, so it capped nothing.
 *
 * An anonymous draft has no person to count against, so it falls back to
 * the per-row jobs_candidates.ai_write_count, which is carried into the
 * account's own counter when the draft is claimed at signup.
 *
 * Past this, a rewrite costs a credit. Building, editing, importing,
 * downloading, applying, every template and the wording check all stay
 * free forever and never touch the credit balance.
 */
export const AI_WRITE_CAP = 2;

/** R45 buys 5 rebuilds. Pitched as what it is: five CVs aimed at five jobs. */
export const CREDITS_PER_PURCHASE = 5;
export const CREDIT_PURCHASE_RANDS = 45;

export const PROVINCE_OPTIONS = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export type WorkHistoryEntry = {
  employer: string;
  role: string;
  start: string;
  end: string | null;
  current: boolean;
  description: string;
  /**
   * What the person could put a number to in this job, in their own words:
   * "served about 200 customers a day", "ran a team of 6". Up to three
   * short lines, always optional, always skippable in one tap.
   *
   * This is the whole reason the numbers step exists. Our AI is forbidden
   * from inventing facts, which means it cannot write an impact bullet
   * unless the person supplies the number, so we ask for the number. No
   * numeral may ever reach a generated bullet that did not come from here
   * or from the description, and that is enforced in code
   * (lib/jobs/ai-write.ts) rather than in the prompt.
   */
  impacts?: string[];
};

/** Up to three number lines per job. More than that stops being a scan. */
export const MAX_IMPACTS = 3;

export type EducationEntry = {
  qualification: string;
  institution: string;
  year: string;
  /** False means they started it and did not finish, which is still worth showing. */
  completed: boolean;
};

export type CertificationEntry = {
  name: string;
  issuer: string;
  year: string;
};

/**
 * The second half of the skills split.
 *
 * Job 3: "Skills split into two labelled groups, practical skills and
 * working skills. Do not use the words hard and soft, they do not
 * translate well in plain South African English."
 *
 * There is no data source for that split: the curated OFO branch skills
 * are all practical by construction, because they hang off a branch of
 * the occupation hierarchy. So the working skills are a fixed curated
 * list offered as their own group of chips in the skills step, and the
 * renderer splits by membership in this list. Anything a person typed
 * themselves that is not in here is treated as practical, which is the
 * safe way round: a practical skill listed under working reads as padding,
 * a working skill listed under practical reads as a skill.
 */
export const WORKING_SKILL_OPTIONS = [
  "Reliable timekeeping",
  "Works well in a team",
  "Works well alone",
  "Good with customers",
  "Stays calm under pressure",
  "Careful with detail",
  "Follows safety rules",
  "Trains and helps new staff",
  "Takes instruction well",
  "Solves problems on the spot",
  "Honest with money and stock",
  "Good written English",
  "Speaks more than one language",
  "Willing to work shifts",
  "Physically fit for the work",
];

const WORKING_SKILL_SET = new Set(WORKING_SKILL_OPTIONS.map((s) => s.toLowerCase()));

export function isWorkingSkill(label: string): boolean {
  return WORKING_SKILL_SET.has(label.trim().toLowerCase());
}

/** Split a flat skill list into the two labelled groups the templates render. */
export function splitSkills(skills: string[]): { practical: string[]; working: string[] } {
  const practical: string[] = [];
  const working: string[] = [];
  for (const s of skills) {
    if (!s?.trim()) continue;
    (isWorkingSkill(s) ? working : practical).push(s.trim());
  }
  return { practical, working };
}

// Spec: "we do not ask for your ID number, and no real employer needs it
// before an interview." Auto-strip anything typed into a free-text field
// that looks like an SA ID number (13 digits) or a bank account number (a
// long run of digits, 9-11 is the common range for SA account numbers),
// replacing it with a fixed, explanatory notice rather than silently
// deleting it -- silence teaches nothing, and this line is itself the
// warning against the most common scam opener in the country.
const ID_NUMBER_PATTERN = /\b\d{13}\b/g;
const LONG_DIGIT_RUN_PATTERN = /\b\d{9,16}\b/g;
const REDACTION_NOTICE =
  "[removed: we do not ask for ID numbers or bank details, and no real employer needs them before an interview]";

export function sanitizeFreeText(input: string): { text: string; wasRedacted: boolean } {
  let text = input;
  let wasRedacted = false;

  if (ID_NUMBER_PATTERN.test(text)) {
    text = text.replace(ID_NUMBER_PATTERN, REDACTION_NOTICE);
    wasRedacted = true;
  }
  // Re-run since the ID pattern's own replacement can shift indices; a
  // fresh test/replace pass on a global regex needs its lastIndex reset,
  // done implicitly by using a new match on the already-substituted text.
  if (LONG_DIGIT_RUN_PATTERN.test(text)) {
    text = text.replace(LONG_DIGIT_RUN_PATTERN, REDACTION_NOTICE);
    wasRedacted = true;
  }

  return { text, wasRedacted };
}
