import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatZar } from "@/lib/bizup/money";
import { documentTitle, type DocType } from "@/lib/bizup/vat";
import { bankNoticeText, type BankNoticeStyle } from "@/lib/bizup/bank";

// BizUp/docs/bizup-phase1-spec.md Sec 9, the public document link.
//
// Sec 9: "The public page contains customer data and banking details, so
// it must never be indexable." noindex is set here and repeated as a real
// X-Robots-Tag header on the PDF route next door, since a metadata tag
// alone does not cover a file download.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// No auth on this page by design: the whole point is that a customer with
// the link can open it. Security comes from the token being long and
// unguessable, and from it being revocable by the member.
export default async function PublicDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  // A revoked link (public_token cleared) or a wrong token both land here.
  if (!doc) notFound();

  const issuer = doc.issuer_snapshot as {
    business_name: string;
    address?: string | null;
    vat_number?: string | null;
    phone?: string | null;
    email?: string | null;
    is_vat_vendor: boolean;
  } | null;
  const customer = doc.customer_snapshot as { name?: string; address?: string | null } | null;
  const bank = doc.bank_snapshot as {
    bank_name: string;
    account_holder: string;
    account_number_masked: string;
    branch_code: string;
    account_type: string;
    notice_style: string;
    notice_phone: string | null;
  } | null;

  const vendor = issuer?.is_vat_vendor ?? false;
  const notice = bank ? bankNoticeText(bank.notice_style as BankNoticeStyle, bank.notice_phone) : null;

  // Dewald's addition: the member sees when their customer first opened
  // this. Written once and never overwritten, so it records the first open
  // rather than the most recent.
  //
  // Honest limitation: this cannot tell the customer apart from the member
  // opening their own link, because the page has no login. It is a useful
  // signal, not proof of receipt.
  if (!doc.first_viewed_at) {
    await admin
      .from("bizup_documents")
      .update({ first_viewed_at: new Date().toISOString() })
      .eq("id", doc.id)
      .is("first_viewed_at", null);
  }

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", doc.id)
    .order("line_no");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                {documentTitle(doc.doc_type as DocType, vendor)}
              </h1>
              <p className="text-sm text-gray-500">{doc.number}</p>
              {doc.valid_until && (
                <p className="text-sm text-gray-500">Valid until {doc.valid_until}</p>
              )}
              {doc.due_date && <p className="text-sm text-gray-500">Due {doc.due_date}</p>}
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-ink">{issuer?.business_name}</p>
              {issuer?.address && <p className="text-gray-500">{issuer.address}</p>}
              {vendor && issuer?.vat_number && (
                <p className="text-gray-500">VAT No. {issuer.vat_number}</p>
              )}
              {issuer?.phone && <p className="text-gray-500">{issuer.phone}</p>}
            </div>
          </div>

          {customer?.name && (
            <div className="mt-6 border-t border-gray-100 pt-4 text-sm">
              <p className="font-semibold text-ink">{customer.name}</p>
              {customer.address && <p className="text-gray-500">{customer.address}</p>}
            </div>
          )}

          <ul className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-4">
            {(lines ?? []).map((l) => (
              <li key={l.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink">{l.description}</span>
                  <span className="text-gray-500">
                    {Number(l.quantity)} {l.unit} at {formatZar(l.unit_price_excl_cents)}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-ink">
                  {formatZar(l.line_total_excl_cents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-4 text-sm">
            {/* Sec 3.1: a non-vendor's document shows no VAT row at all. */}
            {vendor && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatZar(doc.subtotal_excl_cents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT at {(Number(doc.vat_rate) * 100).toFixed(0)}%</span>
                  <span>{formatZar(doc.vat_amount_cents)}</span>
                </div>
              </>
            )}
            <div className="mt-1 flex justify-between text-lg font-bold text-ink">
              <span>Total</span>
              <span>{formatZar(doc.total_incl_cents)}</span>
            </div>
            {vendor && <p className="text-xs text-gray-500">Includes VAT</p>}
            {!vendor && <p className="text-xs text-gray-500">Not a VAT vendor. No VAT charged.</p>}
          </div>

          {doc.notes && <p className="mt-4 text-sm text-gray-600">{doc.notes}</p>}
        </div>

        {bank && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-sm">
            <p className="font-semibold text-ink">Banking details</p>
            <p className="mt-2 text-gray-600">
              {bank.account_holder}, {bank.bank_name}, {bank.account_type}
            </p>
            <p className="text-gray-600">
              Account {bank.account_number_masked}, branch {bank.branch_code}
            </p>
            {/* Sec 8: the same fraud notice that prints on the PDF appears
                above it on the public link, which is where an intercepted
                invoice would actually be read. */}
            {notice && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                {notice}
              </p>
            )}
          </div>
        )}

        {/* Relative on purpose. This page is reached at /d/TOKEN on BizUp's
            own hostname and at /bizup/d/TOKEN elsewhere, and a relative link
            resolves correctly under both without the page needing to know
            which prefix it is under. */}
        <a
          href={`${token}/pdf`}
          className="self-start rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          Download PDF
        </a>

        <p className="text-xs text-gray-400">Generated via BizUp, DigitalFlyer SA</p>
      </div>
    </main>
  );
}
