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
 * Full CV drafts per CV (Write with AI). Separate budget from the polish
 * pass; the handoff's warning is the same for both: this cost scales with
 * unemployment, not revenue, so an uncapped button is a real exposure.
 */
export const AI_WRITE_CAP = 3;

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
};

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
