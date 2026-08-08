"use client";

import { useState } from "react";
import { saveCvAnswer, type CvPurpose } from "@/app/jobs/cv/actions";
import {
  CV_TEMPLATES,
  PORTAL_SAFE_TEMPLATES,
  type CvTemplateId,
} from "@/lib/jobs/pdf/cv-templates";

/**
 * The download step. Handoff Job 4.
 *
 * The person used to pick a look and get a file. One question now sits
 * above that, because the single most useful thing we know and they do
 * not is that large South African employers and every recruitment agency
 * run their CVs through software before a person sees them, and Word
 * comes out of that cleanest.
 *
 * THE RECOMMENDATION IS A NUDGE, NEVER A LOCK. Every template and both
 * formats stay downloadable whatever they answer. The recommended option
 * is preselected and the reason is stated in one line; that is the whole
 * mechanism. A locked choice would be us deciding, and we are guessing
 * about their employer, not knowing.
 */
const PURPOSES: { id: CvPurpose; label: string; note: string }[] = [
  {
    id: "portal",
    label: "Filling in a form on a company website",
    note: "Big companies read CVs with software before a person sees them. Word files come out cleanest.",
  },
  {
    id: "email",
    label: "Emailing it to a person",
    note: "PDF keeps your layout exactly as you see it here. Any look works.",
  },
  {
    id: "print",
    label: "Printing it or handing it over",
    note: "PDF prints the same on any printer. Any look works.",
  },
];

export function CvDownloadPanel({
  candidateId,
  pdfPrefix,
  initialTemplate,
  initialPurpose,
  /** Set when the CV will not fit two pages even at the tightest spacing. */
  overflowingSection,
}: {
  candidateId: string;
  pdfPrefix: string;
  initialTemplate: string;
  initialPurpose: CvPurpose | null;
  overflowingSection: string | null;
}) {
  const [purpose, setPurpose] = useState<CvPurpose | null>(initialPurpose);
  const [template, setTemplate] = useState<string>(initialTemplate);

  function choosePurpose(next: CvPurpose) {
    setPurpose(next);
    void saveCvAnswer(candidateId, { cv_purpose: next });

    // Preselect a template that survives the oldest parsers, but only if
    // they have not already chosen one of them. Somebody who picked Trades
    // on purpose does not get it swapped out from under them; the
    // recommendation line below still tells them what we would send.
    if (next === "portal" && !PORTAL_SAFE_TEMPLATES.includes(template as CvTemplateId)) {
      setTemplate("plain");
      void saveCvAnswer(candidateId, { cv_template: "plain" });
    }
  }

  function chooseTemplate(id: CvTemplateId) {
    setTemplate(id);
    void saveCvAnswer(candidateId, { cv_template: id });
  }

  const chosen = PURPOSES.find((p) => p.id === purpose);
  const wordFirst = purpose === "portal";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-neutral-900">Where are you sending this CV?</p>
        <div className="flex flex-col gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choosePurpose(p.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                purpose === p.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {chosen && <p className="text-xs text-neutral-500">{chosen.note}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Choose a look</p>
        <div className="flex flex-col gap-2">
          {CV_TEMPLATES.map((t) => {
            const recommended = wordFirst && PORTAL_SAFE_TEMPLATES.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseTemplate(t.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  template === t.id
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{t.label}</span>
                  {recommended && (
                    <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-semibold text-accent">
                      Best for forms
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">{t.description}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500">
          All five are free, and always will be. Nothing here needs an account or a payment.
        </p>
      </div>

      {/* Two-page enforcement: tightened spacing first, and if it still
          will not fit, say which section to shorten rather than cutting
          anything. Never silently cut. */}
      {overflowingSection && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your CV runs past two pages. <strong>{overflowingSection}</strong> is the longest part, so
          that is the place to shorten. Nothing has been cut, and it will still download in full.
        </p>
      )}

      {/* Both formats, always, whatever the answer above. The order
          swaps so the recommended one is the first thumb-reach. */}
      <div className="flex flex-col gap-2">
        <a
          href={`${pdfPrefix}/${candidateId}/${wordFirst ? "docx" : "pdf"}`}
          {...(wordFirst ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          {wordFirst ? "Download my CV (Word)" : "Download my CV (PDF)"}
        </a>
        <a
          href={`${pdfPrefix}/${candidateId}/${wordFirst ? "pdf" : "docx"}`}
          {...(wordFirst ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
        >
          {wordFirst ? "Download as PDF instead" : "Download as Word"}
        </a>
      </div>
    </div>
  );
}
