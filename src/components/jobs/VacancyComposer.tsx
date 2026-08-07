"use client";

import { useActionState, useState, useTransition } from "react";
import { saveVacancyDraft, tidyVacancyFields } from "@/app/jobs/employer/post/actions";
import { OfoPicker } from "@/components/jobs/OfoPicker";
import {
  EXPERIENCE_LEVEL_OPTIONS,
  PROVINCE_OPTIONS,
  type OccupationPick,
} from "@/lib/jobs/cv-conversation";

// The structured advert (handoff Job 6): required fields, chosen from the
// identical OFO list and level list the CV builder uses, with the detail
// sections a real advert needs. Saving goes to a DRAFT and a preview
// screen; nothing publishes from here. Write with AI tidies the wording
// in place, restating only what the employer typed, and every field stays
// editable after it runs.

const EMPLOYMENT_TYPES: { id: string; label: string }[] = [
  { id: "full_time", label: "Permanent" },
  { id: "part_time", label: "Part time" },
  { id: "contract", label: "Contract" },
  { id: "temp", label: "Temporary" },
];

const input =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-700";
const err = "text-xs font-normal text-red-600";
const chip = (selected: boolean) =>
  `rounded-full border px-4 py-2.5 text-sm font-medium transition ${
    selected
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
  }`;

export type VacancyInitialValues = {
  vacancyId: string;
  occupation: OccupationPick | null;
  experienceLevel: string;
  title: string;
  suburb: string;
  province: string;
  employmentType: string;
  startsText: string;
  closingDate: string;
  duties: string;
  mustHave: string;
  niceToHave: string;
  qualifications: string;
  selectionProcess: string;
  payText: string;
  salaryPublic: boolean;
};

export function VacancyComposer({ initialValues }: { initialValues?: VacancyInitialValues }) {
  const [state, action, pending] = useActionState(saveVacancyDraft, null);
  const [tidying, startTidying] = useTransition();
  const [tidyError, setTidyError] = useState<string | null>(null);

  const [occupation, setOccupation] = useState<OccupationPick | null>(initialValues?.occupation ?? null);
  const [experienceLevel, setExperienceLevel] = useState(initialValues?.experienceLevel ?? "");
  const [employmentType, setEmploymentType] = useState(initialValues?.employmentType ?? "full_time");
  const [province, setProvince] = useState(initialValues?.province ?? "");
  const [salaryPublic, setSalaryPublic] = useState(initialValues?.salaryPublic ?? true);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [duties, setDuties] = useState(initialValues?.duties ?? "");
  const [mustHave, setMustHave] = useState(initialValues?.mustHave ?? "");
  const [niceToHave, setNiceToHave] = useState(initialValues?.niceToHave ?? "");
  const [qualifications, setQualifications] = useState(initialValues?.qualifications ?? "");
  const [selectionProcess, setSelectionProcess] = useState(initialValues?.selectionProcess ?? "");

  function runTidy() {
    setTidyError(null);
    startTidying(async () => {
      const result = await tidyVacancyFields({
        title,
        duties,
        mustHave,
        niceToHave,
        qualifications,
        selectionProcess,
      });
      if ("error" in result) {
        setTidyError(result.error);
        return;
      }
      setTitle(result.fields.title);
      setDuties(result.fields.duties);
      setMustHave(result.fields.mustHave);
      setNiceToHave(result.fields.niceToHave);
      setQualifications(result.fields.qualifications);
      setSelectionProcess(result.fields.selectionProcess);
    });
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {initialValues && <input type="hidden" name="vacancyId" value={initialValues.vacancyId} />}
      <input type="hidden" name="ofoCode" value={occupation?.code ?? ""} />
      <input type="hidden" name="experienceLevel" value={experienceLevel} />
      <input type="hidden" name="employmentType" value={employmentType} />
      <input type="hidden" name="province" value={province} />
      <input type="hidden" name="salaryPublic" value={salaryPublic ? "true" : "false"} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">What kind of work is it?</p>
        {occupation ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              {occupation.title}
            </span>
            <button
              type="button"
              onClick={() => setOccupation(null)}
              className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <OfoPicker placeholder="e.g. electrician, cashier, driver..." onPick={setOccupation} />
        )}
        {state?.error?.ofoCode?.[0] && <span className={err}>{state.error.ofoCode[0]}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">What level?</p>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVEL_OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => setExperienceLevel(o.id)} className={chip(experienceLevel === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        {state?.error?.experienceLevel?.[0] && <span className={err}>{state.error.experienceLevel[0]}</span>}
      </div>

      <label className={label}>
        Job title
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qualified electrician needed, Boksburg" className={input} />
        {state?.error?.title?.[0] && <span className={err}>{state.error.title[0]}</span>}
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">Type of work</p>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => setEmploymentType(t.id)} className={chip(employmentType === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className={label}>
        Suburb or town
        <input name="suburb" defaultValue={initialValues?.suburb} placeholder="Boksburg" className={input} />
        {state?.error?.suburb?.[0] && <span className={err}>{state.error.suburb[0]}</span>}
      </label>

      {/* A select, not nine chips: same change as the CV builder, same
          reason. Nine fixed options is what a dropdown is for, and on a
          phone the chips wrapped to four rows. */}
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-700">
        Province
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
        >
          <option value="">Choose a province</option>
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {state?.error?.province?.[0] && <span className={err}>{state.error.province[0]}</span>}
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className={label}>
          When does the role start?
          <input name="startsText" defaultValue={initialValues?.startsText} placeholder="As soon as possible" className={input} />
          {state?.error?.startsText?.[0] && <span className={err}>{state.error.startsText[0]}</span>}
        </label>
        <label className={label}>
          Closing date for applications
          <input name="closingDate" type="date" defaultValue={initialValues?.closingDate} className={input} />
          {state?.error?.closingDate?.[0] && <span className={err}>{state.error.closingDate[0]}</span>}
        </label>
      </div>

      <label className={label}>
        Duties and responsibilities
        <textarea name="duties" value={duties} onChange={(e) => setDuties(e.target.value)} rows={5} placeholder="What the person will actually do, day to day." className={input} />
        {state?.error?.duties?.[0] && <span className={err}>{state.error.duties[0]}</span>}
      </label>

      <label className={label}>
        Non-negotiable requirements
        <textarea name="mustHave" value={mustHave} onChange={(e) => setMustHave(e.target.value)} rows={3} placeholder="What they must have. E.g. Trade tested, own transport, 3 years' experience." className={input} />
        {state?.error?.mustHave?.[0] && <span className={err}>{state.error.mustHave[0]}</span>}
      </label>

      <label className={label}>
        Nice to have (optional)
        <textarea name="niceToHave" value={niceToHave} onChange={(e) => setNiceToHave(e.target.value)} rows={2} placeholder="What would help but is not required." className={input} />
      </label>

      <label className={label}>
        Qualifications required
        <textarea name="qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} rows={2} placeholder="E.g. Matric, trade test. Write 'None' if none." className={input} />
        {state?.error?.qualifications?.[0] && <span className={err}>{state.error.qualifications[0]}</span>}
      </label>

      <label className={label}>
        What the selection process looks like
        <textarea name="selectionProcess" value={selectionProcess} onChange={(e) => setSelectionProcess(e.target.value)} rows={3} placeholder="E.g. We call shortlisted people within a week for an interview at our workshop." className={input} />
        {state?.error?.selectionProcess?.[0] && <span className={err}>{state.error.selectionProcess[0]}</span>}
      </label>

      <label className={label}>
        Salary or pay range (optional)
        <input name="payText" defaultValue={initialValues?.payText} placeholder="R8 000 to R12 000 a month" className={input} />
        <span className="text-xs font-normal text-neutral-500">
          Posts may never ask the candidate to pay for anything. Posts that do are held for review.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">Show the pay publicly?</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSalaryPublic(true)} className={chip(salaryPublic)}>
            Show it
          </button>
          <button type="button" onClick={() => setSalaryPublic(false)} className={chip(!salaryPublic)}>
            Keep it private
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={runTidy}
        disabled={tidying || (!duties.trim() && !mustHave.trim())}
        className="w-full rounded-full border border-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-40"
      >
        {tidying ? "Tidying your wording..." : "Tidy my wording with AI"}
      </button>
      {tidyError && <p className="text-sm text-red-600">{tidyError}</p>}

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Preview my advert"}
      </button>
    </form>
  );
}
