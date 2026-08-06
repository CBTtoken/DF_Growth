import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { recentBillingCutoff } from "@/lib/bizup/billing";
import { MetaConversion } from "@/components/analytics/MetaConversion";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Where Paystack returns the member after paying.
//
// Deliberately does not activate anything itself. The webhook is what
// applies the plan or the topup, because a callback URL is just the
// browser coming back and can be missed, closed or replayed. This page
// only reports what the webhook has already recorded, and says so plainly
// when it has not arrived yet rather than claiming success it cannot see.
export default async function BizUpUpgradeDonePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan, topup_balance")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  // Only a payment from the last few minutes counts as "this one". An
  // older event means the webhook for the payment just made has not landed
  // yet, and the page says so rather than claiming a success it cannot
  // see. Filtered in the query rather than after it, so the database does
  // the comparison.
  const { data: recent } = await admin
    .from("bizup_billing_events")
    .select("kind, plan, created_at, paystack_reference, amount_cents")
    .eq("account_id", account.id)
    .gte("created_at", recentBillingCutoff())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      {/* The browser half of the Subscribe conversion. Same event_id as the
          webhook used, which is Paystack own reference, so Meta dedupes the
          two into one sale instead of counting it twice. Consent-gated
          inside the component, so nothing fires for a visitor who declined
          cookies. Only for a plan, never a topup: a topup comes from a
          member who is already here. */}
      {recent?.kind === "subscription" && recent.paystack_reference && (
        <MetaConversion
          event="Subscribe"
          eventId={recent.paystack_reference}
          value={(recent.amount_cents ?? 0) / 100}
          currency="ZAR"
        />
      )}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 p-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {recent ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-ink">Thank you, that is done.</h1>
              <p className="mt-2 text-sm text-gray-600">
                {recent.kind === "topup"
                  ? `Your topup documents are on your account. You now have ${account.topup_balance} in hand, and they do not expire.`
                  : `You are on the ${recent.plan === "unlimited" ? "Unlimited Documents" : "KatisoBiz R49"} plan. Everything it includes is available right now.`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight text-ink">Payment received</h1>
              <p className="mt-2 text-sm text-gray-600">
                Your bank has confirmed the payment. It can take a minute for it to reach us, so if
                your plan still looks the same, give it a moment and refresh this page.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                If it has not changed in ten minutes, send us a message and we will sort it out. You
                have not been charged twice.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/bizup"
              className="rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Back to KatisoBiz
            </Link>
            <Link
              href="/bizup/upgrade"
              className="rounded-full border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              See my plan
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
