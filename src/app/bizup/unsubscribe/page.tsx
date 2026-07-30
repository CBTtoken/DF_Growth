import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { BIZUP_UNSUBSCRIBE_SUBJECT } from "@/lib/bizup/unsubscribe";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// A working unsubscribe link for KatisoBiz members.
//
// The existing /unsubscribe page updates growth_clients and does nothing at
// all for a KatisoBiz member, so a link in a KatisoBiz email would have
// looked like it worked and quietly changed nothing. Dewald asked for a
// real one before sending a personal note to seventeen members.
//
// Public and no auth, because an unsubscribe that asks somebody to sign in
// first is not an unsubscribe. A GET performing a write is unusual but is
// exactly what every real unsubscribe link does: a plain href, no
// JavaScript, no confirmation step.
//
// The token is namespaced with a "bizup:" prefix before hashing, so a token
// minted for a Growth client can never unsubscribe a KatisoBiz account and
// the two systems cannot be confused for one another.
//
// Sets notify_by_email, the same switch the member has in Settings, so
// there is one flag rather than two disagreeing about whether to write to
// somebody. That flag is already honoured by every check-in email and every
// document notification.
export default async function BizUpUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; token?: string }>;
}) {
  const { a: accountId, token } = await searchParams;

  const invalid =
    !accountId || !token || !isValidUnsubscribeToken(BIZUP_UNSUBSCRIBE_SUBJECT(accountId), token);

  let businessName: string | null = null;
  let failed = false;

  if (!invalid) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("bizup_accounts")
      .update({ notify_by_email: false, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .select("business_name")
      .maybeSingle();

    // A valid token with a failed write must never show success. Somebody
    // walking away believing they are unsubscribed when they are not is
    // worse than showing them an error.
    if (error || !data) {
      failed = true;
    } else {
      businessName = data.business_name;
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        {invalid || failed ? (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-2xl text-gray-400">
              ?
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {failed ? "Something went wrong" : "This link is not recognised"}
            </h1>
            <p className="text-sm leading-relaxed text-gray-500">
              {failed
                ? "We could not do that just now."
                : "This link looks incomplete or out of date."}{" "}
              Reply to the email you received and we will take you off by hand, or write to{" "}
              <a href="mailto:info@digitalflyer.co.za" className="text-brand hover:underline">
                info@digitalflyer.co.za
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">
              &#10003;
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Done, no more emails</h1>
            <p className="text-sm leading-relaxed text-gray-500">
              {businessName ? `${businessName} will` : "You will"} not receive any further emails
              from KatisoBiz.
            </p>
            {/* Says plainly what has not been switched off. A member who
                thinks unsubscribing has broken their quotes will not come
                back, and it has not. */}
            <p className="text-sm leading-relaxed text-gray-500">
              Your account, your quotes and your invoices are untouched, and the documents you send
              your own customers are not affected at all. You can turn emails back on any time under
              Settings, then Business details.
            </p>
            <Link
              href="/bizup"
              className="mt-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Back to KatisoBiz
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
