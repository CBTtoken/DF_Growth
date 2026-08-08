"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  saveCvAnswer,
  setListed,
  deleteCv,
  polishCv,
  writeCv,
  acceptWrittenCv,
  startDraft,
  startFreshDraft,
  type CvPurpose,
  type CvRow,
} from "@/app/jobs/cv/actions";
import { useJobsPath } from "@/lib/jobs/use-jobs-path";
import { OfoPicker } from "@/components/jobs/OfoPicker";
import { impactExamplesFor } from "@/lib/jobs/impact-examples";
import { CvCheckList } from "@/components/jobs/CvCheckList";
import { CvDownloadPanel } from "@/components/jobs/CvDownloadPanel";
import { CvAimPanel, type TailoredSummary } from "@/components/jobs/CvAimPanel";
import { runCvCheck, type CvCheckItem } from "@/lib/jobs/cv-check";
import { assembleCv } from "@/lib/jobs/cv-assembly";
import { AI_POLISH_CAP, CREDITS_PER_PURCHASE, CREDIT_PURCHASE_RANDS } from "@/lib/jobs/cv-conversation";
import {
  STEP_ORDER,
  nextStep,
  previousStep,
  stepIndex,
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  PROVINCE_OPTIONS,
  WORKING_SKILL_OPTIONS,
  MAX_ROLES,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceLevel,
  type OccupationPick,
  type StepId,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";

const emptyWorkEntry: WorkHistoryEntry = {
  employer: "",
  role: "",
  start: "",
  end: null,
  current: true,
  description: "",
  impacts: [],
};

const emptyEducation: EducationEntry = { qualification: "", institution: "", year: "", completed: true };
const emptyCertification: CertificationEntry = { name: "", issuer: "", year: "" };

/**
 * "What can you put a number to in this job?"
 *
 * Three short lines, three tappable examples, and skipping is one tap
 * because the Continue button never waits on this. The examples are
 * PHRASES, never numbers: tapping one seeds the box with "Customers you
 * served a day" for the person to finish themselves. Putting a number in
 * a chip would be us writing a fact onto a CV that nobody checked.
 */
function ImpactFields({
  impacts,
  examples,
  onChange,
}: {
  impacts: string[];
  examples: string[];
  onChange: (impacts: string[]) => void;
}) {
  const lines = [0, 1, 2].map((i) => impacts[i] ?? "");

  // Always three slots, blanks and all. Blank lines are stripped once, on
  // the server, in saveCvAnswer, so an untouched box can never become an
  // empty bullet on the CV and the boxes never renumber under a thumb
  // mid-typing.
  function setLine(index: number, value: string) {
    const next = [...lines];
    next[index] = value;
    onChange(next);
  }

  // The first empty line, which is where a tapped example goes.
  const firstEmpty = lines.findIndex((l) => !l.trim());

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
      <p className="text-sm font-semibold text-neutral-800">
        What can you put a number to in this job?
      </p>
      <p className="text-xs text-neutral-500">
        Employers read numbers before anything else. Skip it if you would rather, nothing here is
        required.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            disabled={firstEmpty === -1}
            onClick={() => firstEmpty !== -1 && setLine(firstEmpty, `${example}: `)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 disabled:opacity-40"
          >
            {example}
          </button>
        ))}
      </div>
      {lines.map((line, i) => (
        <input
          key={i}
          type="text"
          value={line}
          onChange={(e) => setLine(i, e.target.value)}
          placeholder={
            i === 0 ? "e.g. Served about 200 customers a day" : i === 1 ? "Another one, if you have it" : "And one more"
          }
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-900"
        />
      ))}
    </div>
  );
}

// Outer wrapper: a brand-new anonymous visitor arrives with no row to
// resume (Server Components can't write the draft cookie during render,
// see resolveCandidateRow's comment), so this creates one via a real
// Server Action on mount before the actual builder ever renders. Existing
// visitors (logged in, or resuming a valid draft cookie) skip straight
// past this with no extra round trip.
export function CvBuilder({
  initialCandidate,
  initialOccupations,
  fromImport = false,
  applyIntent = null,
  creditBalance = 0,
  freeWritesLeft = 0,
  tailored = [],
}: {
  initialCandidate: CvRow | null;
  initialOccupations: OccupationPick[];
  /** Rebuild credits this person holds. Read on the server, never here. */
  creditBalance?: number;
  /** Free Write with AI turns left, per person rather than per CV. */
  freeWritesLeft?: number;
  /** Named, aimed copies of this CV. */
  tailored?: TailoredSummary[];
  /**
   * Arrived here straight from the CV upload. Dewald, 7 August: "there
   * should also be an option at onboarding to skip all the steps if they
   * have a ready CV they just want to add." The upload fills everything a
   * file can carry; the one thing it cannot is the official OFO occupation,
   * which is what every match and every browse filter runs on. So the
   * import lands on that single question and then goes straight to the
   * finished CV, rather than walking the person through eight screens of
   * answers they have already given.
   */
  fromImport?: boolean;
  /**
   * The advert they were trying to apply for when we sent them here to
   * build a CV. Carried so the finished CV can offer that job by name
   * instead of a dashboard link, which is what closes the loop the
   * walkthrough found broken.
   */
  applyIntent?: { id: string; title: string } | null;
}) {
  const [candidate, setCandidate] = useState(initialCandidate);
  const [starting, startTransition] = useTransition();

  useEffect(() => {
    if (candidate) return;
    startTransition(async () => {
      setCandidate(await startDraft());
    });
    // Runs once: candidate flips from null to a real row and this effect
    // never needs to fire again for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!candidate) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-400">{starting ? "Setting up your CV..." : "Loading..."}</p>
      </main>
    );
  }

  return (
    <CvBuilderScreens
      candidate={candidate}
      initialOccupations={initialOccupations}
      fromImport={fromImport}
      applyIntent={applyIntent}
      creditBalance={creditBalance}
      freeWritesLeft={freeWritesLeft}
      tailored={tailored}
    />
  );
}

function CvBuilderScreens({
  candidate,
  initialOccupations,
  fromImport,
  applyIntent,
  creditBalance,
  freeWritesLeft,
  tailored,
}: {
  candidate: CvRow;
  initialOccupations: OccupationPick[];
  fromImport: boolean;
  applyIntent: { id: string; title: string } | null;
  creditBalance: number;
  freeWritesLeft: number;
  tailored: TailoredSummary[];
}) {
  const [id] = useState(candidate.id);
  const [step, setStep] = useState<StepId>(candidate.cv_step ?? "name");
  const [fullName, setFullName] = useState(candidate.full_name ?? "");
  const [phone, setPhone] = useState(candidate.phone ?? "");
  // Up to three occupations from the official OFO list; the first is the
  // headline. Dewald's walkthrough: most people can genuinely do more than
  // one kind of work.
  const [occupations, setOccupations] = useState<OccupationPick[]>(initialOccupations);
  const [experienceLevel, setExperienceLevel] = useState<string>(candidate.experience_level ?? "");
  const [years, setYears] = useState<string>(candidate.years_experience?.toString() ?? "");
  const [suburb, setSuburb] = useState(candidate.suburb ?? "");
  const [province, setProvince] = useState(candidate.province ?? "");
  const [availability, setAvailability] = useState(candidate.availability ?? "");
  const [skills, setSkills] = useState<string[]>(candidate.skills ?? []);
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>(candidate.work_history ?? []);
  const [draftEntry, setDraftEntry] = useState<WorkHistoryEntry>(emptyWorkEntry);
  // Which already-added job has its numbers open for editing. One at a
  // time, so the step does not become a wall on a phone.
  const [openImpactIndex, setOpenImpactIndex] = useState<number | null>(null);
  const [education, setEducation] = useState<EducationEntry[]>(candidate.education ?? []);
  const [draftEducation, setDraftEducation] = useState<EducationEntry>(emptyEducation);
  const [certifications, setCertifications] = useState<CertificationEntry[]>(candidate.certifications ?? []);
  const [draftCertification, setDraftCertification] = useState<CertificationEntry>(emptyCertification);
  const [summary, setSummary] = useState(candidate.summary ?? "");
  const [listed, setListedState] = useState(candidate.listed);
  const homeHref = useJobsPath("/");
  const pdfPrefix = useJobsPath("/cv");
  const signupHref = useJobsPath("/signup");
  const loginHref = useJobsPath("/login");
  const dashboardHref = useJobsPath("/dashboard");
  const importHref = useJobsPath("/cv/import");
  const vacancyPrefix = useJobsPath("/vacancies");

  const [saving, startSaving] = useTransition();
  const [restarting, startRestarting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // An unfinished CV picked up from this browser's cookie, belonging to no
  // account. Named so the person can see at a glance whether it is theirs.
  const resumedDraft = !candidate.owner_user_id && candidate.full_name?.trim() ? candidate.full_name.trim() : null;
  // The builder's own path, for the hard reload after starting fresh.
  const cvHrefPlain = useJobsPath("/cv");

  const roleLabel = occupations[0]?.title;
  const roleCapReached = occupations.length >= MAX_ROLES;
  // Example prompts drawn from this person's own OFO sub-major group, so
  // a plumber is asked about houses finished in a week and a cashier
  // about till points covered. Examples only: tapping one puts the
  // PHRASE in the box, never a number.
  const impactExamples = impactExamplesFor(occupations[0]?.code);

  // The skills step shows only skills from the chosen occupations' own
  // branches of the OFO hierarchy (handoff Job 1: a bricklaying skill can
  // never appear under sales, structurally). Fetched when the codes change.
  const [fetchedSkills, setFetchedSkills] = useState<string[]>([]);
  const [ownSkillText, setOwnSkillText] = useState("");
  const occupationCodes = occupations.map((o) => o.code).join(",");
  useEffect(() => {
    if (!occupationCodes) return;
    let cancelled = false;
    fetch(`/api/jobs/ofo-skills?occupations=${occupationCodes}`)
      .then((res) => res.json())
      .then((body: { skills: string[] }) => {
        if (!cancelled) setFetchedSkills(body.skills ?? []);
      })
      .catch(() => {
        // Keep whatever was last fetched; the step still allows free text.
      });
    return () => {
      cancelled = true;
    };
  }, [occupationCodes]);
  // No occupations means no branch to scope to; derived, not set in the effect.
  const branchSkills = occupationCodes ? fetchedSkills : [];

  // Editing an answer on a finished CV, rather than walking the wizard
  // forward. Dewald, 7 August: "the job seeker can't edit their contact
  // details, add or edit job history."
  //
  // He was right, and the cause was structural rather than a missing
  // button. The wizard is a straight line, a finished CV opens on the last
  // screen of it, and the only way back to the name and phone questions was
  // the Back button pressed ten times. So a jump sets this flag, and the
  // step it lands on saves and returns straight to the review screen
  // instead of continuing forward through eight screens the person has
  // already answered. One mechanism, and the import skip (below) is the
  // same mechanism pointed at a different starting step.
  const [returnToReview, setReturnToReview] = useState(fromImport);

  function jumpTo(target: StepId) {
    setError(null);
    setNotice(null);
    setReturnToReview(true);
    setStep(target);
  }

  function go(patch: Parameters<typeof saveCvAnswer>[1]) {
    const target = returnToReview ? "review" : nextStep(step);
    setError(null);
    startSaving(async () => {
      const result = await saveCvAnswer(id, { ...patch, cv_step: target });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotice(result.redacted ? "We removed something that looked like an ID or bank number." : null);
      setReturnToReview(false);
      setStep(target);
    });
  }

  // What the forward button says. On a jump it is going back to the
  // finished CV, and saying "Continue" there would suggest seven more
  // screens are coming.
  const forwardLabel = returnToReview ? "Save and go back" : "Continue";

  const idx = stepIndex(step);
  const total = STEP_ORDER.length;

  return (
    <main className="flex flex-1 flex-col bg-white">
      {/* Not sticky any more: the Jobs menu is sticky at the top of every
          page now, and two bars pinned to the same edge on a phone leaves
          almost no room for the question itself. */}
      <div className="flex items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3">
        {returnToReview ? (
          // Mid-edit, Back means abandon this edit and return to the CV,
          // not step backwards into a question nobody asked to see.
          <button
            type="button"
            onClick={() => {
              setReturnToReview(false);
              setStep("review");
            }}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            &larr; Back to my CV
          </button>
        ) : idx > 0 ? (
          <button
            type="button"
            onClick={() => setStep(previousStep(step))}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            &larr; Back
          </button>
        ) : (
          <Link href={homeHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
            &larr; Home
          </Link>
        )}
        {!returnToReview && (
          <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full bg-neutral-900 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Somebody else's unfinished CV, resumed from this browser's cookie.
          Only shown when there is a real name in it and no account behind
          it, so it never nags a person working on their own CV. Dewald,
          9 August: logged out in Chrome, tapped Build my free CV, and his
          own details came back. On a borrowed phone that is the previous
          person's name and number, editable, with no way out. */}
      {resumedDraft && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Carrying on with the CV for <strong>{resumedDraft}</strong>.
          </p>
          <button
            type="button"
            disabled={restarting}
            onClick={() =>
              startRestarting(async () => {
                await startFreshDraft();
                // A hard reload rather than a router refresh: every answer
                // on this screen is React state seeded from the old row,
                // and a fresh cookie has to be read from scratch.
                window.location.assign(cvHrefPlain);
              })
            }
            className="shrink-0 rounded-full border border-amber-400 px-4 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50"
          >
            {restarting ? "Starting..." : "Not me, start fresh"}
          </button>
        </div>
      )}

      {notice && (
        <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</p>
      )}
      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        {step === "name" && (
          <Question title="What's your name?">
            <TextField autoFocus value={fullName} onChange={setFullName} placeholder="Sipho Ndlovu" autoComplete="name" />
            <Primary disabled={!fullName.trim() || saving} onClick={() => go({ full_name: fullName })}>
              {forwardLabel}
            </Primary>
            {/* Dewald, 7 August: "it is not very clear where they can
                import their existing CV." It was a grey underlined line
                under the button, which on a phone reads as small print.
                It is now the second real choice on the first screen, and
                it says what it saves you rather than what it does. */}
            {!returnToReview && (
              <Link
                href={importHref}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              >
                I already have a CV, upload it instead
              </Link>
            )}
            {!returnToReview && (
              <p className="text-center text-xs text-neutral-500">
                Upload a PDF or Word CV and we fill this in for you. One question left after that.
              </p>
            )}
          </Question>
        )}

        {step === "phone" && (
          <Question title="What's the best number to reach you on?">
            <TextField type="tel" value={phone} onChange={setPhone} placeholder="082 555 0134" autoComplete="tel" />
            <Primary disabled={!phone.trim() || saving} onClick={() => go({ phone })}>
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "primary_role" && (
          <Question
            title="What work do you do?"
            subtitle={
              roleCapReached
                ? `You have picked ${MAX_ROLES}. Tap one to remove it if you change your mind.`
                : `Start typing and tap the one that fits. You can pick up to ${MAX_ROLES}; the first is your headline.`
            }
          >
            {fromImport && (
              <p className="rounded-xl bg-accent-light px-4 py-3 text-sm text-neutral-800">
                We have everything else from your CV. This is the last question: it is what puts you in
                front of the right employers.
              </p>
            )}
            {occupations.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-xl bg-neutral-50 p-3">
                {occupations.map((o) => (
                  <Chip
                    key={o.code}
                    selected
                    onClick={() => setOccupations((list) => list.filter((x) => x.code !== o.code))}
                  >
                    {o.title} &times;
                  </Chip>
                ))}
              </div>
            )}
            {!roleCapReached && (
              <OfoPicker
                placeholder={occupations.length === 0 ? "e.g. plumber, cashier, driver..." : "Add another kind of work"}
                excludeCodes={occupations.map((o) => o.code)}
                autoFocus={occupations.length === 0}
                onPick={(pick) =>
                  setOccupations((list) => (list.length >= MAX_ROLES ? list : [...list, pick]))
                }
              />
            )}
            <Primary
              disabled={occupations.length === 0 || saving}
              onClick={() =>
                go({
                  ofo_occupation_code: occupations[0]?.code ?? null,
                  secondary_ofo_codes: occupations.slice(1),
                })
              }
            >
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "years_experience" && (
          <Question title={`How many years' experience do you have${roleLabel ? ` as a${/^[aeiou]/i.test(roleLabel) ? "n" : ""} ${roleLabel.toLowerCase()}` : ""}?`}>
            <div className="mb-3 flex flex-wrap gap-2">
              {["0", "1", "2", "3", "5", "10", "15"].map((n) => (
                <Chip key={n} selected={years === n} onClick={() => setYears(n)}>
                  {n}
                </Chip>
              ))}
            </div>
            <TextField
              type="number"
              inputMode="numeric"
              value={years}
              onChange={setYears}
              placeholder="Or type a number"
            />
            <Primary
              disabled={years.trim() === "" || saving}
              onClick={() => go({ years_experience: Number(years) })}
            >
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "experience_level" && (
          <Question title="What level are you at?" subtitle="Pick the one that fits best.">
            <div className="flex flex-col gap-2">
              {EXPERIENCE_LEVEL_OPTIONS.map((o) => (
                <Chip key={o.id} full selected={experienceLevel === o.id} onClick={() => setExperienceLevel(o.id)}>
                  {o.label}
                </Chip>
              ))}
            </div>
            <Primary
              disabled={!experienceLevel || saving}
              onClick={() => go({ experience_level: experienceLevel as ExperienceLevel })}
            >
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "location" && (
          <Question title="Where are you based?">
            <TextField autoFocus value={suburb} onChange={setSuburb} placeholder="Suburb or town, e.g. Boksburg" />
            {/* Nine chips wrapped to four rows on a phone and pushed the
                Continue button off the screen. Dewald: "The Province,
                cant we make it a drop down, we have the information?"
                There are exactly nine, they never change, and a native
                select is the control a phone already knows how to show. */}
            <label className="mb-4 mt-4 flex flex-col gap-1.5 text-sm font-semibold text-neutral-700">
              Province
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
              >
                <option value="">Choose your province</option>
                {PROVINCE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Primary disabled={!suburb.trim() || !province || saving} onClick={() => go({ suburb, province })}>
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "availability" && (
          <Question title="When can you start?">
            <div className="flex flex-col gap-2">
              {AVAILABILITY_OPTIONS.map((o) => (
                <Chip key={o.id} full selected={availability === o.id} onClick={() => setAvailability(o.id)}>
                  {o.label}
                </Chip>
              ))}
            </div>
            <Primary
              disabled={!availability || saving}
              onClick={() => go({ availability: availability as "immediately" | "within_2_weeks" | "flexible" })}
            >
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "skills" && (
          <Question
            title="What can you do?"
            subtitle="These come from your kind of work. Tap what applies, or add your own. Optional."
          >
            {branchSkills.length > 0 && (
              <div className="flex max-h-[38vh] flex-wrap gap-2 overflow-y-auto pb-2">
                {branchSkills.map((label) => (
                  <Chip
                    key={label}
                    selected={skills.includes(label)}
                    onClick={() =>
                      setSkills((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]))
                    }
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            )}
            {/* The second labelled group. Templates render these under
                "Working skills" and the branch ones under "Practical
                skills", never "hard" and "soft", which do not translate
                well in plain South African English. */}
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              How you work
            </p>
            <div className="flex flex-wrap gap-2">
              {WORKING_SKILL_OPTIONS.map((label) => (
                <Chip
                  key={label}
                  selected={skills.includes(label)}
                  onClick={() =>
                    setSkills((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]))
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>

            {skills.filter((s) => !branchSkills.includes(s) && !WORKING_SKILL_OPTIONS.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills
                  .filter((s) => !branchSkills.includes(s) && !WORKING_SKILL_OPTIONS.includes(s))
                  .map((label) => (
                    <Chip key={label} selected onClick={() => setSkills((s) => s.filter((x) => x !== label))}>
                      {label} &times;
                    </Chip>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <TextField value={ownSkillText} onChange={setOwnSkillText} placeholder="Add your own, e.g. First aid" />
              <button
                type="button"
                disabled={!ownSkillText.trim()}
                onClick={() => {
                  const label = ownSkillText.trim().slice(0, 40);
                  setSkills((s) => (s.includes(label) ? s : [...s, label]));
                  setOwnSkillText("");
                }}
                className="shrink-0 rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            <Primary disabled={saving} onClick={() => go({ skills })}>
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "work_history" && (
          <Question title="Where have you worked before?" subtitle="Add as many as you like. This is optional too.">
            {workHistory.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {workHistory.map((w, i) => {
                  const count = (w.impacts ?? []).filter((x) => x?.trim()).length;
                  const open = openImpactIndex === i;
                  return (
                    <li key={i} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 break-words">
                          <strong>{w.role}</strong> at {w.employer}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-medium text-red-600"
                          onClick={() => setWorkHistory((list) => list.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </div>
                      {/* A job added before the numbers question existed,
                          or one somebody skipped, still needs a way in.
                          Without this the only route to adding a number
                          was to delete the job and type it all again. */}
                      <button
                        type="button"
                        onClick={() => setOpenImpactIndex(open ? null : i)}
                        className="mt-1.5 text-xs font-semibold text-neutral-600 underline underline-offset-2"
                      >
                        {count > 0
                          ? `${count} ${count === 1 ? "number" : "numbers"} added, tap to change`
                          : "Add a number to this job"}
                      </button>
                      {open && (
                        <div className="mt-2">
                          <ImpactFields
                            impacts={w.impacts ?? []}
                            examples={impactExamples}
                            onChange={(impacts) =>
                              setWorkHistory((list) =>
                                list.map((entry, j) => (j === i ? { ...entry, impacts } : entry)),
                              )
                            }
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 p-4">
              <TextField value={draftEntry.employer} onChange={(v) => setDraftEntry((d) => ({ ...d, employer: v }))} placeholder="Employer name" />
              <TextField value={draftEntry.role} onChange={(v) => setDraftEntry((d) => ({ ...d, role: v }))} placeholder="Your role there" />
              <TextField value={draftEntry.start} onChange={(v) => setDraftEntry((d) => ({ ...d, start: v }))} placeholder="Year started, e.g. 2021" inputMode="numeric" />
              <div className="flex gap-2">
                <Chip selected={draftEntry.current} onClick={() => setDraftEntry((d) => ({ ...d, current: true, end: null }))}>
                  Still working there
                </Chip>
                <Chip selected={!draftEntry.current} onClick={() => setDraftEntry((d) => ({ ...d, current: false }))}>
                  I&apos;ve left
                </Chip>
              </div>
              {!draftEntry.current && (
                <TextField value={draftEntry.end ?? ""} onChange={(v) => setDraftEntry((d) => ({ ...d, end: v }))} placeholder="Year you left" inputMode="numeric" />
              )}
              <TextField value={draftEntry.description} onChange={(v) => setDraftEntry((d) => ({ ...d, description: v }))} placeholder="What you did there (optional)" />

              {/* The numbers step. The biggest quality lever in the whole
                  product: an employer's first scan lasts six or seven
                  seconds and looks for evidence of scale, not a duty list.
                  Our AI is forbidden from inventing facts, which means it
                  cannot write an impact bullet unless the person supplies
                  the number. So we ask for the number. */}
              <ImpactFields
                impacts={draftEntry.impacts ?? []}
                examples={impactExamples}
                onChange={(impacts) => setDraftEntry((d) => ({ ...d, impacts }))}
              />

              <button
                type="button"
                disabled={!draftEntry.employer.trim() || !draftEntry.role.trim()}
                onClick={() => {
                  setWorkHistory((list) => [...list, draftEntry]);
                  setDraftEntry(emptyWorkEntry);
                }}
                className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-40"
              >
                Add this job
              </button>
            </div>

            <Primary disabled={saving} onClick={() => go({ work_history: workHistory })}>
              {workHistory.length > 0 ? forwardLabel : "Skip, I have no work history yet"}
            </Primary>
          </Question>
        )}

        {step === "education" && (
          <Question
            title="What schooling do you have?"
            subtitle="Whatever you finished counts, and so does something you started. Optional."
          >
            {education.length > 0 && (
              <ul className="mb-2 flex flex-col gap-2">
                {education.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      <strong>{e.qualification}</strong>
                      {e.institution ? `, ${e.institution}` : ""}
                      {e.year ? `, ${e.year}` : ""}
                      {e.completed ? "" : " (not finished)"}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-red-600"
                      onClick={() => setEducation((list) => list.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 p-4">
              <TextField
                value={draftEducation.qualification}
                onChange={(v) => setDraftEducation((d) => ({ ...d, qualification: v }))}
                placeholder="e.g. Matric, N3 Electrical, Grade 10"
              />
              <TextField
                value={draftEducation.institution}
                onChange={(v) => setDraftEducation((d) => ({ ...d, institution: v }))}
                placeholder="School or college (optional)"
              />
              <TextField
                value={draftEducation.year}
                onChange={(v) => setDraftEducation((d) => ({ ...d, year: v }))}
                placeholder="Year (optional)"
                inputMode="numeric"
              />
              <div className="flex gap-2">
                <Chip
                  selected={draftEducation.completed}
                  onClick={() => setDraftEducation((d) => ({ ...d, completed: true }))}
                >
                  I finished it
                </Chip>
                {/* Not finished is worth showing rather than hiding: a
                    part-finished N3 is real training, and leaving it off
                    is us editing somebody's history for them. */}
                <Chip
                  selected={!draftEducation.completed}
                  onClick={() => setDraftEducation((d) => ({ ...d, completed: false }))}
                >
                  I started it
                </Chip>
              </div>
              <button
                type="button"
                disabled={!draftEducation.qualification.trim()}
                onClick={() => {
                  setEducation((list) => [...list, draftEducation]);
                  setDraftEducation(emptyEducation);
                }}
                className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-40"
              >
                Add this
              </button>
            </div>
            <Primary disabled={saving} onClick={() => go({ education })}>
              {education.length > 0 ? forwardLabel : "Skip, I have none to add"}
            </Primary>
          </Question>
        )}

        {step === "certifications" && (
          <Question
            title="Any tickets, licences or courses?"
            subtitle="A driver's licence, a red seal, a first aid course, a forklift ticket. Optional."
          >
            {certifications.length > 0 && (
              <ul className="mb-2 flex flex-col gap-2">
                {certifications.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      <strong>{c.name}</strong>
                      {c.issuer ? `, ${c.issuer}` : ""}
                      {c.year ? `, ${c.year}` : ""}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-red-600"
                      onClick={() => setCertifications((list) => list.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 p-4">
              <TextField
                value={draftCertification.name}
                onChange={(v) => setDraftCertification((d) => ({ ...d, name: v }))}
                placeholder="e.g. Code 10 licence, Forklift ticket"
              />
              <TextField
                value={draftCertification.issuer}
                onChange={(v) => setDraftCertification((d) => ({ ...d, issuer: v }))}
                placeholder="Who gave it to you (optional)"
              />
              <TextField
                value={draftCertification.year}
                onChange={(v) => setDraftCertification((d) => ({ ...d, year: v }))}
                placeholder="Year (optional)"
                inputMode="numeric"
              />
              <button
                type="button"
                disabled={!draftCertification.name.trim()}
                onClick={() => {
                  setCertifications((list) => [...list, draftCertification]);
                  setDraftCertification(emptyCertification);
                }}
                className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-40"
              >
                Add this
              </button>
            </div>
            <Primary disabled={saving} onClick={() => go({ certifications })}>
              {certifications.length > 0 ? forwardLabel : "Skip, I have none"}
            </Primary>
          </Question>
        )}

        {step === "summary" && (
          <Question title="Tell employers a bit about yourself" subtitle="A sentence or two. This is optional.">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Hard worker, reliable, good with people..."
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
            <Primary disabled={saving} onClick={() => go({ summary })}>
              {forwardLabel}
            </Primary>
          </Question>
        )}

        {step === "review" && (
          <ReviewStep
            candidateId={id}
            pdfPrefix={pdfPrefix}
            signupHref={signupHref}
            loginHref={loginHref}
            homeHref={homeHref}
            dashboardHref={dashboardHref}
            onEdit={jumpTo}
            applyIntent={applyIntent}
            vacancyPrefix={vacancyPrefix}
            phone={phone}
            experienceLevel={experienceLevel}
            fullName={fullName}
            roleLabels={occupations.map((o) => o.title)}
            years={years}
            suburb={suburb}
            province={province}
            availability={availability}
            skills={skills}
            workHistory={workHistory}
            summary={summary}
            onPolished={(s, wh) => {
              setSummary(s ?? "");
              setWorkHistory(wh);
            }}
            initialTemplate={candidate.cv_template}
            initialPurpose={candidate.cv_purpose}
            initialPolishCount={candidate.ai_polish_count}
            initialRecommendations={candidate.ai_recommendations ?? []}
            listed={listed}
            onListedChange={setListedState}
            isLoggedIn={!!candidate.owner_user_id}
            setError={setError}
            education={education}
            certifications={certifications}
            creditBalance={creditBalance}
            freeWritesLeft={freeWritesLeft}
            tailored={tailored}
          />
        )}
      </div>
    </main>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold leading-snug text-neutral-900">{title}</h1>
      {subtitle && <p className="-mt-2 text-sm text-neutral-500">{subtitle}</p>}
      {children}
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  autoComplete,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
    />
  );
}

function Chip({
  children,
  selected,
  onClick,
  full,
  disabled,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  full?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full text-left" : ""} rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
        selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

function experienceLevelLabelOf(id: string): string | null {
  return EXPERIENCE_LEVEL_OPTIONS.find((o) => o.id === id)?.label ?? null;
}

/**
 * One line of the finished CV, with the tap that opens the question behind
 * it. An empty section is never a blank space: it says what is missing,
 * marked so the eye finds it, with the same Add tap (INTERFACE-STANDARD.md:
 * an empty state says what will appear here and what to do about it).
 */
function ReviewRow({
  label,
  children,
  onEdit,
  missing,
}: {
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
  missing: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        <div className={`mt-0.5 break-words text-sm ${missing ? "text-neutral-400" : "text-neutral-800"}`}>
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
      >
        {missing ? "Add" : "Edit"}
      </button>
    </div>
  );
}

function ReviewStep({
  candidateId,
  pdfPrefix,
  signupHref,
  loginHref,
  homeHref,
  dashboardHref,
  onEdit,
  applyIntent,
  vacancyPrefix,
  phone,
  experienceLevel,
  fullName,
  roleLabels,
  years,
  suburb,
  province,
  availability,
  skills,
  workHistory,
  summary,
  onPolished,
  initialTemplate,
  initialPurpose,
  initialPolishCount,
  initialRecommendations,
  listed,
  onListedChange,
  isLoggedIn,
  setError,
  education,
  certifications,
  creditBalance,
  freeWritesLeft,
  tailored,
}: {
  candidateId: string;
  pdfPrefix: string;
  signupHref: string;
  loginHref: string;
  homeHref: string;
  dashboardHref: string;
  /** Open one question for editing and come straight back here. */
  onEdit: (step: StepId) => void;
  applyIntent: { id: string; title: string } | null;
  vacancyPrefix: string;
  phone: string;
  experienceLevel: string;
  fullName: string;
  roleLabels: string[];
  years: string;
  suburb: string;
  province: string;
  availability: string;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  summary: string;
  onPolished: (summary: string | null, workHistory: WorkHistoryEntry[]) => void;
  initialTemplate: string;
  initialPurpose: CvPurpose | null;
  initialPolishCount: number;
  initialRecommendations: string[];
  listed: boolean;
  onListedChange: (v: boolean) => void;
  isLoggedIn: boolean;
  setError: (e: string | null) => void;
  education: EducationEntry[];
  certifications: CertificationEntry[];
  creditBalance: number;
  freeWritesLeft: number;
  tailored: TailoredSummary[];
}) {
  const [toggling, startToggling] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [polishing, startPolishing] = useTransition();
  const [writing, startWriting] = useTransition();
  const [accepting, startAccepting] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [polishCount, setPolishCount] = useState(initialPolishCount);
  const [writesLeft, setWritesLeft] = useState(freeWritesLeft);
  const [credits, setCredits] = useState(creditBalance);
  // The AI-written draft under review: nothing in it is saved to the CV
  // until the person explicitly accepts it, and every part stays editable
  // in place first (handoff Job 3).
  const [draft, setDraft] = useState<{ summary: string; workDescriptions: string[] } | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>(initialRecommendations);
  // Skills are stored as their display labels since the OFO switch, so
  // legacy slug values (lowercase-hyphenated) simply render as they are.
  const skillLabels = skills;
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === availability)?.label;
  const polishRemaining = AI_POLISH_CAP - polishCount;
  const hasPolishableText = summary.trim().length > 0 || workHistory.some((w) => (w.description ?? "").trim());

  // The CV check, computed here from live screen state so it updates the
  // moment somebody fixes something, rather than on the next page load.
  // The two-page verdict comes from the same assembly the renderer uses,
  // so the warning and the file can never disagree.
  const assembly = assembleCv({
    fullName,
    phone,
    email: null,
    primaryRole: roleLabels[0] ?? null,
    otherRoles: roleLabels.slice(1),
    yearsExperience: years ? Number(years) : null,
    suburb,
    province,
    availabilityLabel: availabilityLabel ?? null,
    skills: skillLabels,
    workHistory,
    education,
    certifications,
    summary,
  });

  const checkItems: CvCheckItem[] = runCvCheck({
    fullName,
    phone,
    primaryRole: roleLabels[0] ?? null,
    suburb,
    province,
    summary,
    skills: skillLabels,
    workHistory,
    education,
    certifications,
    assembly,
  });

  if (deleted) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Your CV has been deleted</h1>
        <p className="text-sm text-neutral-500">It&apos;s gone for good, and is no longer visible to any employer.</p>
        <Link href={homeHref} className="text-sm font-semibold text-neutral-900 hover:underline">
          Back to KatisoBiz Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Your CV, ready</h1>

      {/* Every part of the CV, each with its own way in. This replaced one
          flat grey block of text that could be read and nothing else:
          "Edit my CV" from the dashboard reopened this same screen, so the
          only route to the name and phone questions was ten taps of Back.
          Anything empty says so and offers the same tap to fill it, which
          is what makes the screen work for somebody who uploaded a CV and
          skipped the questions. */}
      <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white">
        <ReviewRow label="Your details" onEdit={() => onEdit("name")} missing={!fullName.trim() || !phone.trim()}>
          {[fullName, phone].filter((v) => v?.trim()).join(" · ") || "No name or number yet"}
        </ReviewRow>

        <ReviewRow label="The work you do" onEdit={() => onEdit("primary_role")} missing={roleLabels.length === 0}>
          {roleLabels.join(", ") || "Not chosen yet"}
        </ReviewRow>

        <ReviewRow
          label="Experience"
          onEdit={() => onEdit("years_experience")}
          missing={!years && !experienceLevel}
        >
          {[years ? `${years} years` : null, experienceLevelLabelOf(experienceLevel)]
            .filter(Boolean)
            .join(" · ") || "Not said yet"}
        </ReviewRow>

        <ReviewRow label="Where you are" onEdit={() => onEdit("location")} missing={!suburb || !province}>
          {[suburb, province].filter(Boolean).join(", ") || "Not said yet"}
        </ReviewRow>

        <ReviewRow label="When you can start" onEdit={() => onEdit("availability")} missing={!availability}>
          {availabilityLabel ?? "Not said yet"}
        </ReviewRow>

        <ReviewRow label="What you can do" onEdit={() => onEdit("skills")} missing={skillLabels.length === 0}>
          {skillLabels.join(", ") || "No skills added yet"}
        </ReviewRow>

        <ReviewRow label="Work history" onEdit={() => onEdit("work_history")} missing={workHistory.length === 0}>
          {workHistory.length === 0
            ? "Nothing added yet"
            : workHistory.map((w, i) => (
                <span key={i} className="block">
                  {w.role} at {w.employer} ({w.start} to {w.current ? "present" : w.end})
                </span>
              ))}
        </ReviewRow>

        <ReviewRow label="About you" onEdit={() => onEdit("summary")} missing={!summary.trim()}>
          {summary.trim() || "Nothing written yet"}
        </ReviewRow>
      </div>

      {/* The CV check. Replaces a percentage that told somebody they were
          70% done and nothing about which 30% mattered. Every outstanding
          item is a tap straight to the screen that fixes it. */}
      <CvCheckList items={checkItems} onFix={onEdit} />

      {/* Write with AI: drafts the whole CV's prose from the answers
          already given, restating only supplied facts. Shown for review
          and editing, applied only on explicit acceptance. Two free turns
          per person, then a credit. */}
      {!draft && (writesLeft > 0 || credits > 0) && (
        <button
          type="button"
          disabled={writing}
          onClick={() =>
            startWriting(async () => {
              setError(null);
              const result = await writeCv(candidateId);
              if ("error" in result) {
                setError(result.error);
                return;
              }
              setDraft(result.draft);
              if (result.spentCredit) setCredits((c) => Math.max(0, c - 1));
              else setWritesLeft(result.remaining);
            })
          }
          className="w-full rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {writing
            ? "Writing your CV..."
            : writesLeft > 0
              ? `Write my CV with AI (${writesLeft} free ${writesLeft === 1 ? "rewrite" : "rewrites"} left)`
              : "Write my CV with AI (uses 1 credit)"}
        </button>
      )}

      {/* The honest explanation at the moment the free allowance runs out,
          rather than a disabled button with no reason on it. */}
      {!draft && writesLeft === 0 && credits === 0 && (
        <p className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
          You have used your two free rewrites. Building your CV, editing it, downloading it, being
          found and applying all stay free. A rewrite aimed at a job costs one credit, and R
          {CREDIT_PURCHASE_RANDS} buys {CREDITS_PER_PURCHASE}.
        </p>
      )}

      {draft && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-900 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Written from your answers. Change anything, then choose.
          </p>
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
          {draft.workDescriptions.map((d, i) => (
            <div key={i}>
              <p className="mb-1 text-xs text-neutral-500">
                {workHistory[i] ? `${workHistory[i].role} at ${workHistory[i].employer}` : `Job ${i + 1}`}
              </p>
              <textarea
                value={d}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    workDescriptions: draft.workDescriptions.map((x, j) => (j === i ? e.target.value : x)),
                  })
                }
                rows={2}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={accepting}
              onClick={() =>
                startAccepting(async () => {
                  setError(null);
                  const result = await acceptWrittenCv(candidateId, draft);
                  if ("error" in result) {
                    setError(result.error);
                    return;
                  }
                  onPolished(result.summary, result.workHistory);
                  setDraft(null);
                })
              }
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {accepting ? "Saving..." : "Use this wording"}
            </button>
            <button
              type="button"
              disabled={accepting}
              onClick={() =>
                startAccepting(async () => {
                  await acceptWrittenCv(candidateId, null);
                  setDraft(null);
                })
              }
              className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600"
            >
              Keep mine as it was
            </button>
          </div>
        </div>
      )}

      {/* The AI wording pass. Fixes grammar and wording, never invents
          facts, and gives a short improvement list. Capped per CV (spec:
          AI cost scales with unemployment, not revenue). */}
      {hasPolishableText && polishRemaining > 0 && (
        <button
          type="button"
          disabled={polishing}
          onClick={() =>
            startPolishing(async () => {
              setError(null);
              const result = await polishCv(candidateId);
              if ("error" in result) {
                setError(result.error);
                return;
              }
              onPolished(result.summary, result.workHistory);
              setRecommendations(result.recommendations);
              setPolishCount(AI_POLISH_CAP - result.remaining);
            })
          }
          className="w-full rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {polishing
            ? "Checking your wording..."
            : `Check my spelling and wording (${polishRemaining} ${polishRemaining === 1 ? "check" : "checks"} left)`}
        </button>
      )}

      {recommendations.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Ways to make your CV stronger
          </p>
          {recommendations.map((r, i) => (
            <p key={i} className="text-sm text-neutral-700">
              {r}
            </p>
          ))}
        </div>
      )}

      {/* Where it is going, which look, and both formats. Five templates,
          all free, and the recommendation is a nudge rather than a lock. */}
      <CvDownloadPanel
        candidateId={candidateId}
        pdfPrefix={pdfPrefix}
        initialTemplate={initialTemplate}
        initialPurpose={initialPurpose}
        overflowingSection={assembly.fit.overflowing ? assembly.fit.longestSection : null}
      />

      {/* Aim it at one job. The reason somebody buys rebuilds, explained
          before the paywall rather than at it. */}
      <CvAimPanel
        candidateId={candidateId}
        pdfPrefix={pdfPrefix}
        balance={credits}
        tailored={tailored}
        isLoggedIn={isLoggedIn}
        signupHref={signupHref}
      />

      {/* They came here to apply for one specific job. Offer that job, by
          name, above everything else: the walkthrough's worst dead end was
          a person finishing a CV on this screen with no reminder of what
          they had been trying to do. */}
      {applyIntent && isLoggedIn && (
        <Link
          href={`${vacancyPrefix}/${applyIntent.id}`}
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-hover"
        >
          Apply for {applyIntent.title} now
        </Link>
      )}

      {applyIntent && !isLoggedIn && (
        <p className="rounded-xl bg-accent-light px-4 py-3 text-sm text-neutral-800">
          Save your CV below and we take you straight back to{" "}
          <strong>{applyIntent.title}</strong> to apply.
        </p>
      )}

      {isLoggedIn && (
        <Link
          href={dashboardHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
        >
          Go to my dashboard
        </Link>
      )}

      {isLoggedIn ? (
        <button
          type="button"
          disabled={toggling}
          onClick={() =>
            startToggling(async () => {
              const result = await setListed(candidateId, !listed);
              if (result.error) setError(result.error);
              else onListedChange(!listed);
            })
          }
          className="w-full rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {listed ? "Employers can find you, tap to stop" : "Let employers looking for someone like you find you"}
        </button>
      ) : (
        <>
          <Link
            href={signupHref}
            className="inline-flex w-full items-center justify-center rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Save my CV so I can come back to it
          </Link>
          {/* Dewald, 9 August: "when I click on Save my CV so I can come
              back it takes me to a new registration screen, should it not
              take me back to my dashboard?" Registration is right for
              somebody genuinely new and a dead end for everybody else, who
              were being asked to make a second account to save a CV they
              already had somewhere to put. Logging in now claims this
              draft too, so the CV on this screen follows them into the
              account they already have. */}
          <Link
            href={loginHref}
            className="text-center text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            I already have an account, log in
          </Link>
        </>
      )}

      {/* Destructive action, asks first, worded so it's clear what's lost
          (INTERFACE-STANDARD.md). Only meaningful once there's an account
          to delete from -- an unclaimed draft is just abandoned, nothing
          to explicitly delete. */}
      {isLoggedIn && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-medium text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline"
            >
              Delete my CV
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Delete your CV for good?</p>
              <p className="text-xs text-red-700">
                This removes your name, contact details and everything you typed. It cannot be undone, and
                you will stop appearing to employers immediately.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    startDeleting(async () => {
                      const result = await deleteCv(candidateId);
                      if (result.error) setError(result.error);
                      else setDeleted(true);
                    })
                  }
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete it"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
