import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount } from "@/lib/bizup/documents";
import { correctionWindowWarning } from "@/app/bizup/invoices/[id]/fix/actions";
import { FixForm } from "@/components/bizup/FixInvoiceForms";
import { formatZar } from "@/lib/bizup/money";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 7.
//
// "This flow is the highest-risk moment in the product. A member who has
// just realised they made a mistake on a document they already sent to a
// paying customer is stressed. Every word must reduce panic, not add
// vocabulary."
//
// The copy below is built verbatim from Sec 7's screen copy and should not
// be improvised on. The step is carried in the URL rather than in
// component state so that Sec 7's "every path is reversible up until the
// final button" is structurally true: nothing is written until a form is
// submitted, and the browser back button always works.
export default async function FixInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;

  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc) notFound();
  // A draft is simply edited. There is nothing to fix until it has been
  // issued, which is also why there is no inline edit pencil anywhere on an
  // issued invoice: this flow is the only way in.
  if (!doc.number) redirect(`/bizup/invoices/${id}`);

  const [{ data: lines }, { data: payments }] = await Promise.all([
    admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
    admin.from("bizup_payments").select("amount_cents").eq("document_id", id),
  ]);

  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const lateWarning = await correctionWindowWarning(doc.issue_date);
  const snapshot = (doc.customer_snapshot ?? {}) as {
    name?: string;
    address?: string;
    vat_number?: string | null;
  };

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 p-6">
        <Link
          href={`/bizup/invoices/${id}`}
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to the invoice
        </Link>

        <FixForm
          documentId={doc.id}
          number={doc.number}
          step={step ?? "1"}
          paidCents={paid}
          paidLabel={formatZar(paid)}
          lateWarning={lateWarning}
          customerName={snapshot.name ?? ""}
          customerAddress={snapshot.address ?? ""}
          customerVatNumber={snapshot.vat_number ?? ""}
          lines={(lines ?? []).map((l) => ({ id: l.id, description: l.description }))}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
