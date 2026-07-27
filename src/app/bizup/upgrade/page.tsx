import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { TOPUP_DOCUMENTS } from "@/lib/bizup/billing";
import { startBizUpUpgrade, startBizUpTopup } from "@/app/bizup/upgrade/actions";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Feature lists match the published pricing table on the landing page
// exactly. If the two ever disagree, a member has been sold one thing and
// shown another, so they are worth keeping boring and identical rather
// than reworded for variety.
const PLANS = [
  {
    id: "paid" as const,
    name: "KatisoBiz",
    price: "R49",
    per: "per month",
    features: [
      "75 documents a month",
      "All 5 templates",
      "Your own logo",
      "Customer list",
      "Reports and statements",
      "Export for your accountant",
    ],
  },
  {
    id: "unlimited" as const,
    name: "Unlimited",
    price: "R89",
    per: "per month",
    features: ["Unlimited documents", "Everything in KatisoBiz", "Up to 5 users", "Recurring invoices"],
  },
];

export default async function BizUpUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; already?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("plan, plan_source, topup_balance")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  const params = await searchParams;
  const plan = account.plan as BizUpPlan;
  const capabilities = capabilitiesFor(plan);
  const bundled = account.plan_source !== "self_paid" && plan !== "free";

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href="/bizup"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to KatisoBiz
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Your plan</h1>
          <p className="mt-1 text-sm text-gray-500">
            You are on the{" "}
            <span className="font-semibold text-ink">
              {plan === "free" ? "Free" : plan === "unlimited" ? "Unlimited" : "KatisoBiz R49"}
            </span>{" "}
            plan,{" "}
            {capabilities.documentsPerMonth === null
              ? "with unlimited documents."
              : `with ${capabilities.documentsPerMonth} documents a month.`}
            {account.topup_balance > 0 && ` You also have ${account.topup_balance} topup documents in hand.`}
          </p>
        </div>

        {params.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            We could not open the payment page. Please try again, and if it keeps happening send us
            a message.
          </p>
        )}

        {/* Sec 2's bundling: Growth Engine and Enterprise include the R49
            tier. Selling them a second subscription for what they already
            have would be the worst kind of billing bug, so the buttons are
            not shown at all rather than merely discouraged. */}
        {bundled ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
            <p className="font-semibold">This is already included with your DigitalFlyer Growth plan.</p>
            <p className="mt-1">
              There is nothing more to pay. If you cancel Growth, KatisoBiz moves back to the free
              plan and your documents stay where they are.
            </p>
          </div>
        ) : (
          <>
            {params.already && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                You are already on a paid plan, so there is nothing to buy here.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {PLANS.map((p) => (
                <form
                  key={p.id}
                  action={startBizUpUpgrade}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <input type="hidden" name="plan" value={p.id} />
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-bold text-ink">{p.name}</h2>
                    <span className="text-lg font-bold text-ink">
                      {p.price} <span className="text-sm font-normal text-gray-500">{p.per}</span>
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <button
                    type="submit"
                    disabled={plan === p.id}
                    className="mt-4 w-full rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {plan === p.id ? "Your current plan" : `Pay ${p.price} a month`}
                  </button>
                </form>
              ))}
            </div>
          </>
        )}

        {/* Topups are for anyone, including a paid member having a big
            month. Sec 2: they never expire, which is why they are a stored
            balance rather than a bigger monthly allowance. */}
        {capabilities.documentsPerMonth !== null && (
          <form
            action={startBizUpTopup}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-ink">Having a big month?</h2>
            <p className="mt-1 text-sm text-gray-500">
              Top up for another {TOPUP_DOCUMENTS} documents. They never expire, and they are used
              only once your monthly allowance runs out.
            </p>
            <button
              type="submit"
              className="mt-4 rounded-full border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              Buy {TOPUP_DOCUMENTS} more documents
            </button>
          </form>
        )}

        <p className="text-xs text-gray-500">
          Payments are handled by Paystack. Your card details never reach KatisoBiz. You can cancel
          a monthly plan at any time and keep everything you have already created.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
