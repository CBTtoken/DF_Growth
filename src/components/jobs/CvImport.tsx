"use client";

// Upload-an-existing-CV flow (handoff Job 2): file in, parsed fields out,
// shown for confirmation and correction before anything is saved. The
// file itself never leaves this request's memory on the server and is
// never stored. LinkedIn gets plain instructions, never an integration.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { applyImportedCv } from "@/app/jobs/cv/actions";
import { useJobsPath } from "@/lib/jobs/use-jobs-path";
import type { ImportedCvFields } from "@/lib/jobs/cv-import";

const input =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-900";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-700";

export function CvImport() {
  const router = useRouter();
  const cvHref = useJobsPath("/cv");
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ImportedCvFields | null>(null);
  const [saving, startSaving] = useTransition();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/jobs/cv-import", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "That did not work. Please try again.");
        return;
      }
      setFields(body.fields as ImportedCvFields);
    } catch {
      setError("That did not work. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function confirm() {
    if (!fields) return;
    startSaving(async () => {
      setError(null);
      const result = await applyImportedCv({
        full_name: fields.fullName ?? undefined,
        phone: fields.phone ?? undefined,
        suburb: fields.suburb ?? undefined,
        province: fields.province ?? undefined,
        years_experience: fields.yearsExperience ?? undefined,
        summary: fields.summary ?? undefined,
        skills: fields.skills,
        work_history: fields.workHistory,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(cvHref);
    });
  }

  if (fields) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          Check what we read from your CV and fix anything that is wrong. Nothing is saved until you tap
          the button at the bottom. Your uploaded file has already been discarded; we keep only what you
          confirm here.
        </p>

        <label className={label}>
          Your full name
          <input
            value={fields.fullName ?? ""}
            onChange={(e) => setFields({ ...fields, fullName: e.target.value })}
            className={input}
          />
        </label>
        <label className={label}>
          Your mobile number
          <input
            value={fields.phone ?? ""}
            onChange={(e) => setFields({ ...fields, phone: e.target.value })}
            className={input}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Suburb or town
            <input
              value={fields.suburb ?? ""}
              onChange={(e) => setFields({ ...fields, suburb: e.target.value })}
              className={input}
            />
          </label>
          <label className={label}>
            Province
            <input
              value={fields.province ?? ""}
              onChange={(e) => setFields({ ...fields, province: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <label className={label}>
          About you
          <textarea
            value={fields.summary ?? ""}
            onChange={(e) => setFields({ ...fields, summary: e.target.value })}
            rows={3}
            className={input}
          />
        </label>
        <label className={label}>
          Skills, comma separated
          <input
            value={fields.skills.join(", ")}
            onChange={(e) =>
              setFields({
                ...fields,
                skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
              })
            }
            className={input}
          />
        </label>

        {fields.workHistory.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-neutral-700">Work history</p>
            {fields.workHistory.map((w, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={w.role}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        workHistory: fields.workHistory.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)),
                      })
                    }
                    placeholder="Role"
                    className={input}
                  />
                  <input
                    value={w.employer}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        workHistory: fields.workHistory.map((x, j) => (j === i ? { ...x, employer: e.target.value } : x)),
                      })
                    }
                    placeholder="Employer"
                    className={input}
                  />
                </div>
                <textarea
                  value={w.description}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      workHistory: fields.workHistory.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                    })
                  }
                  rows={2}
                  placeholder="What you did there"
                  className={input}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFields({ ...fields, workHistory: fields.workHistory.filter((_, j) => j !== i) })
                  }
                  className="self-start text-xs font-medium text-red-600"
                >
                  Remove this job
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={confirm}
          className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "This is right, carry on with my CV"}
        </button>
        <button
          type="button"
          onClick={() => setFields(null)}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Start over with a different file
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleUpload} className="flex flex-col gap-4">
      <label className={label}>
        Your CV as a PDF or Word file
        <input type="file" name="file" accept=".pdf,.docx" required className={input} />
      </label>

      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        <p className="font-semibold text-neutral-800">Coming from LinkedIn?</p>
        <p className="mt-1">
          LinkedIn does not let other apps read your profile, but you can save it yourself: open your
          LinkedIn profile, tap the <strong>More</strong> button, choose <strong>Save to PDF</strong>, then
          upload that file here.
        </p>
      </div>

      <p className="text-xs text-neutral-500">
        We read the file, show you what we found, and throw the file away. It is never stored. If your CV
        has your ID number on it, we remove it: no real employer needs it before an interview.
      </p>

      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_JOBS_TURNSTILE_SITE_KEY} />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
      >
        {uploading ? "Reading your CV..." : "Upload and read my CV"}
      </button>
    </form>
  );
}
