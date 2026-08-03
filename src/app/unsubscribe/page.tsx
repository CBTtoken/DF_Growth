import { BrandHeader } from "@/components/brand/BrandHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUnsubscribeToken } from "@/lib/email/unsubscribe-token";

// Legacy Reactivation Sprint 2, Section 9. Public, no auth — a one-click
// unsubscribe link has to work without asking someone to sign in first.
// Marks growth_clients.email_unsubscribed_at rather than deleting or
// disabling the account itself; only ever gates future marketing/campaign
// sends (see migration comment), not the account or its transactional
// email. A GET request performing the write is unusual, but this is what
// every real-world unsubscribe link does (a plain <a href>, no JS, no
// confirmation click needed) — that's the whole point of the pattern.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; token?: string; email?: string }>;
}) {
  const { client: clientId, token, email } = await searchParams;

  // Cold outreach build, 3 August 2026: the same page also serves the
  // marketing list's one-click unsubscribe, keyed on the address itself
  // (marketing contacts have no client id). The token is the same HMAC
  // scheme over the lowercased address. A suppression is permanent by
  // design: the insert is the record, and nothing ever deletes it.
  if (email && token) {
    const address = email.trim().toLowerCase();
    const valid = isValidUnsubscribeToken(address, token);
    let ok = false;
    if (valid) {
      const admin = createAdminClient();
      const { error } = await admin.from("marketing_suppressions").upsert(
        {
          email: address,
          reason: "unsubscribed",
          detail: "One-click unsubscribe from a marketing email",
        },
        { onConflict: "email", ignoreDuplicates: true }
      );
      if (!error) {
        ok = true;
        await admin
          .from("marketing_contacts")
          .update({ status: "declined", updated_at: new Date().toISOString() })
          .eq("email", address);
      }
    }
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          {ok ? (
            <>
              <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
              <h1 className="text-2xl font-bold tracking-tight text-ink">You&apos;re unsubscribed</h1>
              <p className="text-sm text-gray-500">
                We will not email {address} again, and your details are off our marketing list for good.
              </p>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-2xl text-gray-400">?</span>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                {valid ? "Something went wrong" : "Link not recognized"}
              </h1>
              <p className="text-sm text-gray-500">
                {valid
                  ? "We couldn't process this just now."
                  : "This unsubscribe link looks incomplete or out of date."}{" "}
                If you&apos;d rather not hear from us, reply to the email you received and let us know.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  const invalid = !clientId || !token || !isValidUnsubscribeToken(clientId, token);

  let businessName: string | null = null;
  let failed = false;
  if (!invalid) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("growth_clients")
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq("id", clientId)
      .select("business_name")
      .maybeSingle();
    // A valid token but a failed write (row missing, DB error) must not
    // show the success state — silently claiming success on a write that
    // didn't happen is worse than showing an error, since the person
    // walks away believing they're unsubscribed when they aren't.
    if (error || !data) {
      failed = true;
    } else {
      businessName = data.business_name;
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        {invalid || failed ? (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-2xl text-gray-400">?</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {failed ? "Something went wrong" : "Link not recognized"}
            </h1>
            <p className="text-sm text-gray-500">
              {failed
                ? "We couldn't process this just now."
                : "This unsubscribe link looks incomplete or out of date."}{" "}
              If you&apos;d rather not hear from us, reply to the email you received and let us know.
            </p>
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">You&apos;re unsubscribed</h1>
            <p className="text-sm text-gray-500">
              {businessName ? `${businessName} won't` : "You won't"}{" "}
              receive any further emails from this campaign. Your live page and account, if you choose to use them,
              aren&apos;t affected.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
