"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { postVacancy } from "@/app/jobs/employer/post/actions";
import { ROLE_CATEGORIES, roleCategoryLabel, PROVINCE_OPTIONS } from "@/lib/jobs/cv-conversation";

type Taxonomy = { id: string; slug: string; label: string; category: string }[];

// One vacancy, one position: the same two-level field-then-position picker
// the CV builder uses, single-select here because a post is for one job.
// Everything else is a structural field, not a free text box (spec).

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

export function VacancyComposer({ taxonomy, dashboardHref }: { taxonomy: Taxonomy; dashboardHref: string }) {
  const [state, action, pending] = useActionState(postVacancy, null);

  const [roleCategory, setRoleCategory] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string>("");
  const [otherRole, setOtherRole] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [province, setProvince] = useState("");

  const grouped = useMemo(() => {
    const byCategory = new Map<string, Taxonomy>();
    for (const t of taxonomy) {
      const list = byCategory.get(t.category) ?? [];
      list.push(t);
      byCategory.set(t.category, list);
    }
    return byCategory;
  }, [taxonomy]);

  const fieldList = useMemo(() => {
    const known = ROLE_CATEGORIES.filter((c) => grouped.has(c.id));
    const unknown = [...grouped.keys()]
      .filter((id) => !ROLE_CATEGORIES.some((c) => c.id === id))
      .map((id) => ({ id, label: roleCategoryLabel(id) }));
    return [...known, ...unknown];
  }, [grouped]);

  const roleLabel = taxonomy.find((t) => t.id === roleId)?.label ?? otherRole;

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
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="otherRoleText" value={otherRole} />
      <input type="hidden" name="employmentType" value={employmentType} />
      <input type="hidden" name="province" value={province} />

      {/* The kind of work, field then position. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-700">What kind of work is it?</p>
        {roleLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">{roleLabel}</span>
            <button
              type="button"
              onClick={() => {
                setRoleId("");
                setOtherRole("");
                setRoleCategory(null);
              }}
              className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
            >
              Change
            </button>
          </div>
        ) : roleCategory === null ? (
          <div className="flex flex-wrap gap-2">
            {fieldList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setRoleCategory(c.id)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRoleCategory("other")}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
            >
              Not listed
            </button>
          </div>
        ) : roleCategory === "other" ? (
          <input
            value={otherRole}
            onChange={(e) => setOtherRole(e.target.value)}
            placeholder="Type the kind of work"
            className={input}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(grouped.get(roleCategory) ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRoleId(t.id)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRoleCategory(null)}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-neutral-400"
            >
              &larr; Other fields
            </button>
          </div>
        )}
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
