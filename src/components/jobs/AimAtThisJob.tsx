"use client";

import { useState, useTransition } from "react";
import { tailorCv, startCreditPurchase } from "@/app/jobs/cv/actions";
import { CREDITS_PER_PURCHASE, CREDIT_PURCHASE_RANDS } from "@/lib/jobs/cv-conversation";

/**
 * "Aim my CV at this job", on the advert itself.
 *
 * This closes a promise the product was already making and could not
 * keep: the home page band says "Pick a job from our board and we rewrite
 * yours to lead with the experience that job is asking for", and until
 * now the only way to aim a CV was to copy the advert out and paste it
 * back in on another screen.
 *
 * The vacancy id goes to the server and the advert is read there. The
 * client never sends the advert text for a board job, so a person cannot
 * hand us a vacancy id and a body that do not match.
 *
 * Only rendered for somebody who already has a CV worth aiming. Offering
 * a paid rewrite to a person with nothing to rewrite is a way of taking
 * money for nothing.
 */
export function AimAtThisJob({
  candidateId,
  vacancyId,
  vacancyTitle,
  employerName,
  balance: initialBalance,
  cvHref,
}: {
  candidateId: string;
  vacancyId: string;
  vacancyTitle: string;
  employerName: string;
  balance: number;
  cvHref: string;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [done, setDone] = useState<{
    id: string;
    name: string;
    summary: string;
    movedUp: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();

  if (done) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-900 bg-white p-4">
        <p className="text-sm font-bold text-neutral-900">
          Your CV is aimed at this job, saved as &ldquo;{done.name}&rdquo;
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          It leads with the experience this advert asks for, in your own facts. Nothing was added that
          you had not already told us.
        </p>

        {/* Show the work, rather than asserting it happened. */}
        <div className="mt-3 rounded-lg bg-neutral-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Your new opening
          </p>
          <p className="mt-1 text-sm text-neutral-800">{done.summary}</p>
          {done.movedUp.length > 0 && (
            <p className="mt-2 text-xs text-neutral-600">
              Moved to the front, because this advert asks for{" "}
              {done.movedUp.length === 1 ? "it" : "them"}:{" "}
              <strong className="font-semibold">{done.movedUp.join(", ")}</strong>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`${cvHref}/${candidateId}/pdf?aimed=${done.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Download it (PDF)
          </a>
          <a
            href={`${cvHref}/${candidateId}/docx?aimed=${done.id}`}
            className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700"
          >
            Word
          </a>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Apply above when you are ready. {balance} {balance === 1 ? "rewrite" : "rewrites"} left.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-neutral-100 bg-white p-4">
      <p className="text-sm font-bold text-neutral-900">Aim your CV at this job</p>
      <p className="mt-1 text-xs text-neutral-600">
        {employerName} will read your CV looking for the words in this advert. We rewrite yours to lead
        with the experience they are asking for, using only what you have already told us. If they want
        something you have not done, we leave it out.
      </p>

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {balance > 0 ? (
        <button
          type="button"
          disabled={working}
          onClick={() =>
            startWorking(async () => {
              setError(null);
              const result = await tailorCv(candidateId, {
                vacancyId,
                name: `${vacancyTitle}, ${employerName}`.slice(0, 80),
              });
              if ("error" in result) {
                setError(result.error);
                return;
              }
              setBalance(result.balance);
              setDone({
                id: result.id,
                name: result.name,
                summary: result.summary,
                movedUp: result.movedUp,
              });
            })
          }
          className="mt-3 w-full rounded-full border border-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {working ? "Aiming your CV..." : `Aim my CV at this job (uses 1 of ${balance})`}
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={working}
            onClick={() =>
              startWorking(async () => {
                setError(null);
                const result = await startCreditPurchase(window.location.href);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                window.location.assign(result.authorizationUrl);
              })
            }
            className="mt-3 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {working
              ? "Opening payment..."
              : `${CREDITS_PER_PURCHASE} CVs aimed at ${CREDITS_PER_PURCHASE} different jobs, R${CREDIT_PURCHASE_RANDS}`}
          </button>
          {/* Said at the paywall, not only in the FAQ. Applying is the
              thing they came here to do and it must stay obviously free. */}
          <p className="mt-2 text-xs text-neutral-500">
            You do not need this to apply. Applying with the CV you have is free, and always will be.
          </p>
        </>
      )}
    </div>
  );
}
