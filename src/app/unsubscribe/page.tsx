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
  searchParams: Promise<{ client?: string; token?: string }>;
}) {
  const { client: clientId, token } = await searchParams;

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
