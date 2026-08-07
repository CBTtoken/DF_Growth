"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { postVacancy } from "@/app/jobs/employer/post/actions";
import { OfoPicker } from "@/components/jobs/OfoPicker";
import {
  EXPERIENCE_LEVEL_OPTIONS,
  PROVINCE_OPTIONS,
  type OccupationPick,
} from "@/lib/jobs/cv-conversation";

// One vacancy, one position, chosen from the identical official OFO list
// the CV builder uses (handoff Job 1: "Do not build two different
// pickers") -- that shared structure is what makes matching work. Level
// uses the same five values as the CV. Everything else is a structural
// field, not a free text box.

const EMPLOYMENT_TYPES: { id: string; label: string }[] = [
  { id: "full_time", label: "Full time" },
  { id: "part_time", label: "Part time" },
  { id: "contract", label: "Contract" },
  { id: "temp", label: "Temporary" },
];

const input =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-700";
const err = "text-xs font-normal text-red-600";

export function VacancyComposer({ dashboardHref }: { dashboardHref: string }) {
  const [state, action, pending] = useActionState(postVacancy, null);

  const [occupation, setOccupation] = useState<OccupationPick | null>(null);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [province, setProvince] = useState("");

  if (state?.held) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="text-lg font-bold text-amber-900">Your post is being reviewed</h2>
        <p className="text-sm text-amber-800">
          Something in the wording needs a person to look at it first, usually within a day. It will go live
          the moment it is approved. One common reason: posts may never ask candidates to pay for anything,
          not training, uniforms, or admin fees.
        </p>
        <Link href={dashboardHref} className="text-sm font-semibold text-amber-900 underline underline-offset-2">
          Back to my jobs
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="ofoCode" value={occupation?.code ?? ""} />
      <input type="hidden" name="experienceLevel" value={experienceLevel} />
      <input type="hidden" name="employmentType" value={employmentType} />
      <input type="hidden" name="province" value={province} />

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
            <button
              key={o.id}
              type="button"
              onClick={() => setExperienceLevel(o.id)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                experienceLevel === o.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {state?.error?.experienceLevel?.[0] && <span className={err}>{state.error.experienceLevel[0]}</span>}
      </div>

      <label className={label}>
        Job title
        <input name="title" placeholder="Qualified electrician needed, Boksburg" className={input} />
        {state?.error?.title?.[0] && <span className={err}>{state.error.title[0]}</span>}
      </label>

      <label className={label}>
        The details
        <textarea
          name="description"
          rows={6}
          placeholder="What the job involves, the hours, what you need from them, and how to apply."
          className={input}
        />
        {state?.error?.description?.[0] && <span className={err}>{state.error.description[0]}</span>}
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">Type of work</p>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEmploymentType(t.id)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                employmentType === t.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className={label}>
        Suburb or town
        <input name="suburb" placeholder="Boksburg" className={input} />
        {state?.error?.suburb?.[0] && <span className={err}>{state.error.suburb[0]}</span>}
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">Province</p>
        <div className="flex flex-wrap gap-2">
          {PROVINCE_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvince(p)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                province === p
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {state?.error?.province?.[0] && <span className={err}>{state.error.province[0]}</span>}
      </div>

      <label className={label}>
        Pay, if you want to say
        <input name="payText" placeholder="R8 000 a month, or Negotiable" className={input} />
        <span className="text-xs font-normal text-neutral-500">
          Posts may never ask the candidate to pay for anything. Posts that do are held for review.
        </span>
      </label>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Posting..." : "Post this job for 30 days"}
      </button>
    </form>
  );
}
