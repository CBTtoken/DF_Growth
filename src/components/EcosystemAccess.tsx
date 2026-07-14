// Shown both pre-signup (pricing page, as a value-prop) and post-signup
// (dashboard, as an actionable next step) — same block works for both, the
// surrounding heading/framing differs by page, not this component.
//
// Public Beta Polish Sprint Sec 11: marketplaceUrl replaces the old
// websiteUrl-does-double-duty approach (see git history for the prior
// version's own comment on this) — this is now an admin-only field
// (growth_clients.marketplace_url, set from /admin/clients/[id]), never
// auto-generated from a subdomain guess, never exposed to the client
// anywhere. The client's own Website URL still exists, it's just shown
// elsewhere now (LeadForm.tsx's success state, alongside their other
// public contact details) since that's the client-facing use of it,
// distinct from this admin-managed listing link.
//
// Sec 4: unlocked reflects whether this account has ever actually paid
// (paystack_reference is non-null) — true immediately for Growth (which
// only ever reaches "active" status via a real payment) and only once a
// Foundation trial converts to paid. Computed live from current account
// state rather than a stored flag, so it flips the moment a payment
// succeeds with no separate "activate Marketplace" step needed anywhere.
//
// Combined spec Sec 33: audited — RE:Biz Nomads is a live Facebook group,
// joining is literally just clicking through and requesting to join, with
// no price, checkout, or payment reference anywhere in this flow. Business
// email/phone for cross-product matching is whatever Growth already
// captured at onboarding (contact_email, call_phone, whatsapp_phone) —
// nothing new to collect here, since this is just a link, not a form.
const REBIZ_GROUP_URL = "https://www.facebook.com/groups/rebiznomadsdealroom";

export function EcosystemAccess({
  marketplaceUrl,
  unlocked = true,
}: {
  marketplaceUrl?: string | null;
  // Only ever false for a Foundation client still on their free trial —
  // defaults true so the pre-signup /pricing page usage (which has no
  // real account to check) isn't accidentally gated.
  unlocked?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight text-ink">DigitalFlyer SA Marketplace</h3>
        {unlocked ? (
          <>
            <p className="text-sm text-gray-500">
              Every paid membership gets a spot on our marketplace directory automatically —
              there&apos;s nothing to request.
            </p>
            {marketplaceUrl ? (
              <p className="mt-1 text-sm text-gray-500">
                View your listing{" "}
                <a
                  href={marketplaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  here
                </a>
                .
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                We&apos;re setting your listing up, check back soon.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Included once you continue past your trial — no action needed, it activates
            automatically the moment you add payment.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight text-ink">RE:Biz Nomads Community</h3>
        <p className="text-sm text-gray-500">
          Free and included with every membership — no extra cost. Join our private community of
          South African business owners for deals, support, and real conversations with people
          building the same thing you are.
        </p>
        <a
          href={REBIZ_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Join the group
        </a>
      </div>
    </div>
  );
}
