import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { currentAccount } from "@/lib/bizup/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteFooter } from "@/components/SiteFooter";
import { StartingNumberForm } from "@/components/bizup/StartingNumberForm";

export const metadata: Metadata = {
  title: "Invoice numbering",
  robots: { index: false, follow: false },
};

// Continuing a numbering sequence from whatever the member used before.
//
// Raised by a real member moving across from their own books: a tax
// invoice has to carry a number in a sequential series, so somebody who
// reached 450 elsewhere and then starts again at 1 has broken that series
// and it reads as missing invoices. Every serious invoicing product has
// this and ours did not.
//
// Its own page rather than another card on Business details, because it is
// the one setting that becomes permanent the moment the first document is
// issued, and it needs the room to say so.
export default async function BizUpNumberingPage() {
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const year = new Date().getFullYear();

  const { data: counters } = await admin
    .from("bizup_number_counters")
    .select("series, next_value")
    .eq("account_id", account.id)
    .eq("year", year);

  // Locked per series by whether anything in it has ever been issued, not
  // by whether a counter row exists. The counter is created by the first
  // allocation, so keying off its presence would lock the page the moment
  // a member set a number without issuing anything.
  const { data: issued } = await admin
    .from("bizup_documents")
    .select("series")
    .eq("account_id", account.id)
    .not("number", "is", null);

  const issuedSeries = new Set((issued ?? []).map((d) => d.series));
  const nextFor = (series: string) =>
    counters?.find((c) => c.series === series)?.next_value ?? 1;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href="/bizup/settings"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to settings
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Invoice numbering</h1>
          <p className="mt-2 text-sm text-gray-500">
            Already invoicing somewhere else? Carry on from where you left off. If your last
            invoice was number 450, set this to 451 and KatisoBiz continues your sequence.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            <strong>Set this before you send your first one.</strong> Invoice numbers have to run in
            an unbroken sequence, so once you have issued one this locks. Starting again at 1 when
            your old book reached 450 looks like missing invoices to an auditor.
          </p>
        </div>

        <StartingNumberForm
          series="INV"
          label="Invoices"
          locked={issuedSeries.has("INV")}
          currentNext={nextFor("INV")}
          year={year}
        />

        <StartingNumberForm
          series="QUO"
          label="Quotes"
          locked={issuedSeries.has("QUO")}
          currentNext={nextFor("QUO")}
          year={year}
        />

        <p className="text-xs text-gray-500">
          Numbering restarts at 1 each January, which is normal and is what the year in the number
          is for. You only need to set this once, for the year you join.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
