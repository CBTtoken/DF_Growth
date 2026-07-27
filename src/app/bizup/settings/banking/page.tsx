import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBankSummary } from "@/app/bizup/bank-actions";
import { BankDetailsSection, BankNoticeSection } from "@/components/bizup/BankDetailsForm";
import type { BankNoticeStyle } from "@/lib/bizup/bank";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 8, banking details and the invoice
// interception fraud notice.
export default async function BizUpBankingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("phone, bank_notice_style, bank_notice_none_ack_at")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!account) redirect("/bizup/start");

  const summary = await getBankSummary();
  if (!summary) redirect(await bizupLoginPath());

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <Link
          href="/bizup"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to BizUp
        </Link>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Banking details</h1>
          <p className="mt-1 text-sm text-gray-500">
            This is where your customers pay you. It prints on every invoice you send.
          </p>
          <div className="mt-6">
            <BankDetailsSection summary={summary} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Protect against fake invoices</h2>
          <div className="mt-4">
            <BankNoticeSection
              current={account.bank_notice_style as BankNoticeStyle}
              phone={account.phone}
              alreadyAcknowledged={!!account.bank_notice_none_ack_at}
            />
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
