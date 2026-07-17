"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminChangePlan, grantAdminComp, endAdminComp } from "@/app/admin/clients/[id]/actions";

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "foundation", label: "Foundation" },
  { value: "growth_engine", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

// Real gap Dewald flagged: some prospects want DigitalFlyer to build and
// publish their page first, let them test it, then start paying — there
// was no way to do that short of a direct database edit. This is the
// admin-facing side of that: an immediate, no-Paystack plan override, and
// a free-access grant (any plan, admin-chosen end date or indefinite)
// that publishes the page and behaves like a real trial for the
// account — see grantAdminComp/endAdminComp's own comments for the exact
// mechanics.
export function AdminPlanControls({
  clientId,
  currentPlan,
  isAdminComped,
  adminCompUntil,
  adminCompNote,
}: {
  clientId: string;
  currentPlan: string;
  isAdminComped: boolean;
  adminCompUntil: string | null;
  adminCompNote: string | null;
}) {
  const [planState, planAction, planPending] = useActionState(adminChangePlan, null);
  const [compState, compAction, compPending] = useActionState(grantAdminComp, null);
  const [isEnding, startEnding] = useTransition();
  const router = useRouter();

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Plan &amp; free access</h2>
        <p className="mt-1 text-sm text-gray-500">
          Admin-only controls. Changing the plan here does not touch Paystack — use this for
          comped/test accounts, not to bypass billing on a real paying client.
        </p>
      </div>

      <form action={planAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="clientId" value={clientId} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Change plan</label>
          <select
            name="plan"
            defaultValue={currentPlan}
            className="h-10 min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={planPending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
        >
          {planPending ? "Saving..." : "Save plan"}
        </button>
        {planState?.error && <p className="w-full text-xs text-red-600">{planState.error}</p>}
        {planState?.success && <p className="w-full text-xs text-green-700">Plan updated.</p>}
      </form>

      <div className="border-t border-gray-100 pt-6">
        {isAdminComped ? (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                Free access via Admin{" "}
                {adminCompUntil ? `until ${new Date(adminCompUntil).toLocaleDateString("en-ZA")}` : "— indefinitely"}
              </p>
              {adminCompNote && <p className="mt-1 text-sm text-gray-600">&ldquo;{adminCompNote}&rdquo;</p>}
              <p className="mt-1 text-xs text-gray-500">
                Automatically pauses on the end date if set. End it now to prompt payment sooner.
              </p>
            </div>
            <button
              type="button"
              disabled={isEnding}
              onClick={() =>
                startEnding(async () => {
                  await endAdminComp(clientId);
                  router.refresh();
                })
              }
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-400 disabled:opacity-50"
            >
              {isEnding ? "Ending..." : "End free access now"}
            </button>
          </div>
        ) : (
          <form action={compAction} className="flex flex-col gap-3">
            <input type="hidden" name="clientId" value={clientId} />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Grant free access</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500">Plan</label>
                <select
                  name="plan"
                  defaultValue={currentPlan === "foundation" ? "foundation" : currentPlan}
                  className="h-10 min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500">Free until (blank = indefinite)</label>
                <input
                  type="date"
                  name="until"
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Note (optional, for your own reference)</label>
              <input
                type="text"
                name="note"
                placeholder="e.g. Building their page before they commit"
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="submit"
              disabled={compPending}
              className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-spark px-5 text-xs font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-spark-dark hover:text-white disabled:opacity-50"
            >
              {compPending ? "Granting..." : "Grant free access"}
            </button>
            {compState?.error && <p className="text-xs text-red-600">{compState.error}</p>}
            {compState?.success && <p className="text-xs text-green-700">Free access granted.</p>}
          </form>
        )}
      </div>
    </section>
  );
}
