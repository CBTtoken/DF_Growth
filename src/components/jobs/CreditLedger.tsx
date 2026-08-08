import type { LedgerEntry } from "@/lib/jobs/credits";

/**
 * What you bought and what you spent it on.
 *
 * `getLedger` was written in the credits sprint and nothing ever called
 * it, which meant somebody could pay R45 and have no record of it
 * anywhere they could see. A paid feature with no receipt is the kind of
 * thing people are right not to trust, and this product is sold to people
 * who have every reason to be careful with R45.
 *
 * Server component: the ledger is read on the server and rendered, so a
 * balance can never be shown from stale client state.
 */
export function CreditLedger({ balance, entries }: { balance: number; entries: LedgerEntry[] }) {
  if (balance === 0 && entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-neutral-900">Your rewrites</p>
        <p className="text-sm font-semibold text-neutral-700">
          {balance} left
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">Nothing spent yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block break-words text-sm text-neutral-800">
                  {e.detail ?? reasonLabel(e.reason)}
                </span>
                <span className="block text-xs text-neutral-400">
                  {new Date(e.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  e.delta > 0 ? "text-green-700" : "text-neutral-500"
                }`}
              >
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        Rewrites never expire. Building your CV, downloading it, being found and applying stay free,
        always.
      </p>
    </div>
  );
}

function reasonLabel(reason: string): string {
  if (reason === "purchase") return "Bought rewrites";
  if (reason === "refund_failed_generation") return "Refunded, a rewrite did not work";
  if (reason === "rebuild") return "Rewrote your CV";
  return "Aimed your CV at a job";
}
