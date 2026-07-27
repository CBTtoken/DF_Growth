import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount } from "@/lib/bizup/documents";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 7, the success screen. Copy verbatim.
//
// Sec 7's foolproofing rule that shapes this page: "After any correction,
// the member's next screen must show clearly what the customer will now
// receive, and they must press Send themselves. The system never re-sends
// automatically." So this page tells them what happened and hands them a
// review link. It sends nothing.
export default async function FixDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cn?: string; new?: string }>;
}) {
  const { id } = await params;
  const { cn, new: replacementId } = await searchParams;

  const account = await currentAccount();
  if (!account) redirect("/bizup/login");

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, status")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!doc) notFound();

  // The replacement's number is looked up rather than passed in the URL, so
  // the screen cannot be made to claim a number that does not exist.
  const { data: replacement } = replacementId
    ? await admin
        .from("bizup_documents")
        .select("id, number")
        .eq("id", replacementId)
        .eq("account_id", account.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 p-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Done.</h1>

          <p className="mt-3 text-sm text-gray-700">
            Invoice {doc.number} has been cancelled{cn ? ` with credit note ${cn}` : ""}.
          </p>

          {replacement && (
            <p className="mt-2 text-sm text-gray-700">
              Your new invoice {replacement.number ?? "is a draft and"} is ready to review and send.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {replacement ? (
              <Link
                href={`/bizup/invoices/${replacement.id}`}
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Review and send
              </Link>
            ) : (
              <Link
                href="/bizup/invoices"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Back to your invoices
              </Link>
            )}

            <Link
              href={`/bizup/invoices/${doc.id}`}
              className="text-center text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
            >
              See the cancelled invoice
            </Link>
          </div>

          <p className="mt-5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            Nothing has been sent to your customer. Send it yourself when you are happy with it.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
