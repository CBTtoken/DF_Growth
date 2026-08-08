"use client";

import { useState, useTransition } from "react";
import { tailorCv, startCreditPurchase, deleteTailoredCv } from "@/app/jobs/cv/actions";
import { CREDITS_PER_PURCHASE, CREDIT_PURCHASE_RANDS } from "@/lib/jobs/cv-conversation";

export interface TailoredSummary {
  id: string;
  name: string;
  createdAt: string;
  /** The rewritten opening, so a paid rewrite shows its work. */
  summary?: string | null;
}

/**
 * Aim your CV at one job. Handoff Job 5, and the thing a rebuild credit
 * buys.
 *
 * Pitched as what it is, on the button and everywhere else: five CVs
 * aimed at five different jobs, R45. Never "AI credits", which tells
 * somebody nothing about what they get.
 *
 * The free-versus-paid line is stated here in full rather than left to
 * the FAQ, because this is where a person meets the paywall and it is the
 * last honest moment to say what stays free.
 */
export function CvAimPanel({
  candidateId,
  pdfPrefix,
  balance: initialBalance,
  tailored: initialTailored,
  isLoggedIn,
  signupHref,
}: {
  candidateId: string;
  pdfPrefix: string;
  balance: number;
  tailored: TailoredSummary[];
  isLoggedIn: boolean;
  signupHref: string;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [tailored, setTailored] = useState(initialTailored);
  const [open, setOpen] = useState(false);
  const [advertText, setAdvertText] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const [buying, startBuying] = useTransition();

  function buy() {
    startBuying(async () => {
      setError(null);
      const result = await startCreditPurchase(window.location.href);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.authorizationUrl);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-neutral-900">Aim your CV at a job</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Employers look for their own words on your CV. We rewrite yours to lead with the
            experience that job is asking for, using your own facts.
          </p>
        </div>
        {isLoggedIn && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
            {balance} left
          </span>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {tailored.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          {tailored.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block break-words font-medium text-neutral-800">{t.name}</span>
                {t.summary && (
                  <span className="mt-0.5 block text-xs text-neutral-500">{t.summary}</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <a
                  href={`${pdfPrefix}/${candidateId}/pdf?aimed=${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-neutral-700 underline underline-offset-2"
                >
                  PDF
                </a>
                <a
                  href={`${pdfPrefix}/${candidateId}/docx?aimed=${t.id}`}
                  className="text-xs font-semibold text-neutral-700 underline underline-offset-2"
                >
                  Word
                </a>
                <button
                  type="button"
                  onClick={() =>
                    startWorking(async () => {
                      const result = await deleteTailoredCv(t.id);
                      if (result.error) setError(result.error);
                      else setTailored((list) => list.filter((x) => x.id !== t.id));
                    })
                  }
                  className="text-xs font-medium text-red-600"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!isLoggedIn ? (
        <a
          href={signupHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-900"
        >
          Save your CV to an account first
        </a>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-full border border-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
        >
          {balance > 0 ? "Aim my CV at a job" : `Get ${CREDITS_PER_PURCHASE} aimed CVs for R${CREDIT_PURCHASE_RANDS}`}
        </button>
      ) : (
        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-700">
            Paste the advert
            <textarea
              value={advertText}
              onChange={(e) => setAdvertText(e.target.value)}
              rows={5}
              placeholder="Copy the whole job advert and paste it here, or pick a job from our board and use the button on that page."
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-700">
            Call it something, so you know which went where
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shoprite cashier"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-neutral-900"
            />
          </label>

          {balance > 0 ? (
            <button
              type="button"
              disabled={working || advertText.trim().length < 40}
              onClick={() =>
                startWorking(async () => {
                  setError(null);
                  const result = await tailorCv(candidateId, { advertText, name });
                  if ("error" in result) {
                    setError(result.error);
                    return;
                  }
                  setTailored((list) => [
                    {
                      id: result.id,
                      name: result.name,
                      createdAt: new Date().toISOString(),
                      summary: result.summary,
                    },
                    ...list,
                  ]);
                  setBalance(result.balance);
                  setAdvertText("");
                  setName("");
                  setOpen(false);
                })
              }
              className="w-full rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {working ? "Aiming your CV..." : "Aim my CV at this job (uses 1)"}
            </button>
          ) : (
            <button
              type="button"
              disabled={buying}
              onClick={buy}
              className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {buying
                ? "Opening payment..."
                : `${CREDITS_PER_PURCHASE} CVs aimed at ${CREDITS_PER_PURCHASE} different jobs, R${CREDIT_PURCHASE_RANDS}`}
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-center text-xs font-medium text-neutral-500 underline underline-offset-2"
          >
            Not now
          </button>
        </div>
      )}

      {/* The free-versus-paid line, in full, at the point somebody meets
          the price. Job 6: the promise stays true in substance and the
          wording has to say so everywhere it appears. */}
      <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        Building your CV, downloading it, being found and applying are free, always. R
        {CREDIT_PURCHASE_RANDS} buys {CREDITS_PER_PURCHASE} rewrites aimed at {CREDITS_PER_PURCHASE}{" "}
        different jobs. Credits never expire, and they are not refundable once spent.
      </p>
    </div>
  );
}
