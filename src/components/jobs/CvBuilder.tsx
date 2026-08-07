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
  type CvRow,
} from "@/app/jobs/cv/actions";
import { CV_TEMPLATES } from "@/lib/jobs/pdf/cv-templates";
import { useJobsPath } from "@/lib/jobs/use-jobs-path";
import { OfoPicker } from "@/components/jobs/OfoPicker";
import {
  STEP_ORDER,
  nextStep,
  previousStep,
  stepIndex,
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  PROVINCE_OPTIONS,
  MAX_ROLES,
  AI_POLISH_CAP,
  AI_WRITE_CAP,
  type ExperienceLevel,
  type OccupationPick,
  type StepId,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";

const emptyWorkEntry: WorkHistoryEntry = { employer: "", role: "", start: "", end: null, current: true, description: "" };

// Outer wrapper: a brand-new anonymous visitor arrives with no row to
// resume (Server Components can't write the draft cookie during render,
// see resolveCandidateRow's comment), so this creates one via a real
// Server Action on mount before the actual builder ever renders. Existing
// visitors (logged in, or resuming a valid draft cookie) skip straight
// past this with no extra round trip.
export function CvBuilder({
  initialCandidate,
  initialOccupations,
}: {
  initialCandidate: CvRow | null;
  initialOccupations: OccupationPick[];
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

  return <CvBuilderScreens candidate={candidate} initialOccupations={initialOccupations} />;
}

function CvBuilderScreens({
  candidate,
  initialOccupations,
}: {
  candidate: CvRow;
  initialOccupations: OccupationPick[];
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
  const [summary, setSummary] = useState(candidate.summary ?? "");
  const [listed, setListedState] = useState(candidate.listed);
  const homeHref = useJobsPath("/");
  const pdfPrefix = useJobsPath("/cv");
  const signupHref = useJobsPath("/signup");
  const dashboardHref = useJobsPath("/dashboard");
  const importHref = useJobsPath("/cv/import");

  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleLabel = occupations[0]?.title;
  const roleCapReached = occupations.length >= MAX_ROLES;

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

  function go(target: StepId, patch: Parameters<typeof saveCvAnswer>[1]) {
    setError(null);
    startSaving(async () => {
      const result = await saveCvAnswer(id, { ...patch, cv_step: target });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotice(result.redacted ? "We removed something that looked like an ID or bank number." : null);
      setStep(target);
    });
  }

  const idx = stepIndex(step);
  const total = STEP_ORDER.length;

  return (
    <main className="flex flex-1 flex-col bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur">
        {idx > 0 ? (
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
        <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-neutral-900 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      {notice && (
        <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</p>
      )}
      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        {step === "name" && (
          <Question title="What's your name?">
            <TextField autoFocus value={fullName} onChange={setFullName} placeholder="Sipho Ndlovu" autoComplete="name" />
            <Primary disabled={!fullName.trim() || saving} onClick={() => go(nextStep(step), { full_name: fullName })}>
              Continue
            </Primary>
            <Link
              href={importHref}
              className="mt-1 text-center text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
            >
              Already have a CV? Upload it instead
            </Link>
          </Question>
        )}

        {step === "phone" && (
          <Question title="What's the best number to reach you on?">
            <TextField type="tel" value={phone} onChange={setPhone} placeholder="082 555 0134" autoComplete="tel" />
            <Primary disabled={!phone.trim() || saving} onClick={() => go(nextStep(step), { phone })}>
              Continue
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
                go(nextStep(step), {
                  ofo_occupation_code: occupations[0]?.code ?? null,
                  secondary_ofo_codes: occupations.slice(1),
                })
              }
            >
              Continue
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
              onClick={() => go(nextStep(step), { years_experience: Number(years) })}
            >
              Continue
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
              onClick={() => go(nextStep(step), { experience_level: experienceLevel as ExperienceLevel })}
            >
              Continue
            </Primary>
          </Question>
        )}

        {step === "location" && (
          <Question title="Where are you based?">
            <TextField autoFocus value={suburb} onChange={setSuburb} placeholder="Suburb or town, e.g. Boksburg" />
            <p className="mb-2 mt-4 text-sm font-semibold text-neutral-700">Province</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {PROVINCE_OPTIONS.map((p) => (
                <Chip key={p} selected={province === p} onClick={() => setProvince(p)}>
                  {p}
                </Chip>
              ))}
            </div>
            <Primary disabled={!suburb.trim() || !province || saving} onClick={() => go(nextStep(step), { suburb, province })}>
              Continue
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
              onClick={() => go(nextStep(step), { availability: availability as "immediately" | "within_2_weeks" | "flexible" })}
            >
              Continue
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
            {skills.filter((s) => !branchSkills.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills
                  .filter((s) => !branchSkills.includes(s))
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
            <Primary disabled={saving} onClick={() => go(nextStep(step), { skills })}>
              Continue
            </Primary>
          </Question>
        )}

        {step === "work_history" && (
          <Question title="Where have you worked before?" subtitle="Add as many as you like. This is optional too.">
            {workHistory.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {workHistory.map((w, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                    <span>
                      <strong>{w.role}</strong> at {w.employer}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600"
                      onClick={() => setWorkHistory((list) => list.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
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

            <Primary disabled={saving} onClick={() => go(nextStep(step), { work_history: workHistory })}>
              {workHistory.length > 0 ? "Continue" : "Skip, I have no work history yet"}
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
            <Primary disabled={saving} onClick={() => go(nextStep(step), { summary })}>
              Continue
            </Primary>
          </Question>
        )}

        {step === "review" && (
          <ReviewStep
            candidateId={id}
            pdfPrefix={pdfPrefix}
            signupHref={signupHref}
            homeHref={homeHref}
            dashboardHref={dashboardHref}
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
            initialPolishCount={candidate.ai_polish_count}
            initialWriteCount={candidate.ai_write_count}
            initialRecommendations={candidate.ai_recommendations ?? []}
            listed={listed}
            onListedChange={setListedState}
            isLoggedIn={!!candidate.owner_user_id}
            setError={setError}
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

function ReviewStep({
  candidateId,
  pdfPrefix,
  signupHref,
  homeHref,
  dashboardHref,
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
  initialPolishCount,
  initialWriteCount,
  initialRecommendations,
  listed,
  onListedChange,
  isLoggedIn,
  setError,
}: {
  candidateId: string;
  pdfPrefix: string;
  signupHref: string;
  homeHref: string;
  dashboardHref: string;
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
  initialPolishCount: number;
  initialWriteCount: number;
  initialRecommendations: string[];
  listed: boolean;
  onListedChange: (v: boolean) => void;
  isLoggedIn: boolean;
  setError: (e: string | null) => void;
}) {
  const [toggling, startToggling] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [polishing, startPolishing] = useTransition();
  const [writing, startWriting] = useTransition();
  const [accepting, startAccepting] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [template, setTemplate] = useState(initialTemplate);
  const [polishCount, setPolishCount] = useState(initialPolishCount);
  const [writeCount, setWriteCount] = useState(initialWriteCount);
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

      <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-700">
        <p><strong>{fullName}</strong></p>
        <p>{roleLabels.join(", ")}{years ? ` · ${years} years' experience` : ""}</p>
        <p>{suburb}{province ? `, ${province}` : ""}</p>
        {availabilityLabel && <p>Available: {availabilityLabel}</p>}
        {skillLabels.length > 0 && <p>Skills: {skillLabels.join(", ")}</p>}
        {workHistory.length > 0 && (
          <div>
            <p className="mt-2 font-semibold text-neutral-900">Work history</p>
            {workHistory.map((w, i) => (
              <p key={i}>
                {w.role} at {w.employer} ({w.start} to {w.current ? "present" : w.end})
              </p>
            ))}
          </div>
        )}
        {summary && <p className="mt-2 italic">&ldquo;{summary}&rdquo;</p>}
      </div>

      {/* Write with AI: drafts the whole CV's prose from the answers
          already given, restating only supplied facts. Shown for review
          and editing, applied only on explicit acceptance. Capped. */}
      {!draft && AI_WRITE_CAP - writeCount > 0 && (
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
              setWriteCount(AI_WRITE_CAP - result.remaining);
            })
          }
          className="w-full rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {writing
            ? "Writing your CV..."
            : `Write my CV with AI (${AI_WRITE_CAP - writeCount} ${AI_WRITE_CAP - writeCount === 1 ? "turn" : "turns"} left)`}
        </button>
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

      {/* Three looks over the same content, same structural idea as
          KatisoBiz's document templates. */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Choose a look</p>
        <div className="flex gap-2">
          {CV_TEMPLATES.map((t) => (
            <Chip
              key={t.id}
              selected={template === t.id}
              onClick={() => {
                setTemplate(t.id);
                void saveCvAnswer(candidateId, { cv_template: t.id });
              }}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      <a
        href={`${pdfPrefix}/${candidateId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
      >
        Download my CV (PDF)
      </a>
      <a
        href={`${pdfPrefix}/${candidateId}/docx`}
        className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
      >
        Download as Word
      </a>

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
        <Link
          href={signupHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
        >
          Save my CV so I can come back to it
        </Link>
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
