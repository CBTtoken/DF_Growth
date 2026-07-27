import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, loadSettings } from "@/lib/bizup/documents";
import { addLine, updateLine, removeLine } from "@/app/bizup/quotes/actions";
import { whatsappLinkFor } from "@/app/bizup/quotes/send-actions";
import { IssueInvoiceButton, RecordPaymentForm } from "@/components/bizup/InvoiceActions";
import { ShareQuote } from "@/components/bizup/ShareQuote";
import { formatZar } from "@/lib/bizup/money";
import { isVatVendor, taxInvoiceLevel, FULL_TAX_INVOICE_NOTICE, documentTitle } from "@/lib/bizup/vat";
import { CATALOGUE_UNITS } from "@/lib/bizup/schemas";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default async function BizUpInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await currentAccount();
  if (!account) redirect("/bizup/login");

  const admin = createAdminClient();
  const [{ data: doc }, { data: lines }, { data: payments }, settings] = await Promise.all([
    admin
      .from("bizup_documents")
      .select("*, bizup_customers(name, email, whatsapp)")
      .eq("id", id)
      .eq("account_id", account.id)
      .eq("doc_type", "invoice")
      .maybeSingle(),
    admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
    admin.from("bizup_payments").select("*").eq("document_id", id).order("paid_at"),
    loadSettings(),
  ]);

  if (!doc) notFound();

  const vendor = isVatVendor(account.vat_number);
  // Sec 7: "There is no inline edit pencil on an issued invoice anywhere in
  // the UI." Editing stops the moment a number exists.
  const editable = doc.number === null && doc.status === "draft";
  const rows = lines ?? [];
  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const outstanding = doc.total_incl_cents - paid;

  const customerRow = doc.bizup_customers as unknown as {
    name: string;
    email: string | null;
    whatsapp: string | null;
  } | null;

  const host = (await headers()).get("host") ?? "bizup.digitalflyer.co.za";
  const publicUrl = doc.public_token
    ? `${host.startsWith("localhost") ? "http" : "https"}://${host}${
        host.split(":")[0].toLowerCase().startsWith("bizup.") ? "" : "/bizup"
      }/d/${doc.public_token}`
    : "";

  const level = taxInvoiceLevel(doc.total_incl_cents, settings, vendor);
  const unitLabel = (u: string) => CATALOGUE_UNITS.find((x) => x.value === u)?.label ?? u;

  return (
    <main className="flex flex-1 flex-col bg-gray-50 pb-32">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href="/bizup/invoices" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to invoices
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {doc.number ?? `${documentTitle("invoice", vendor)} (draft)`}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {customerRow?.name ? `For ${customerRow.name}. ` : ""}
            {doc.due_date ? `Due ${doc.due_date}.` : ""}
          </p>
        </div>

        {level === "full" && editable && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {FULL_TAX_INVOICE_NOTICE}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">What you are charging for</h2>
          {rows.map((line) =>
            editable ? (
              <form key={line.id} action={updateLine} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <input type="hidden" name="documentId" value={doc.id} />
                <input type="hidden" name="lineId" value={line.id} />
                <input name="description" defaultValue={line.description} className={input} />
                <div className="grid grid-cols-3 gap-2">
                  <input name="quantity" defaultValue={Number(line.quantity)} inputMode="decimal" className={input} />
                  <input name="unitPrice" defaultValue={(line.unit_price_excl_cents / 100).toFixed(2)} inputMode="decimal" className={input} />
                  <span className="py-2.5 text-right text-base font-semibold text-ink">
                    {formatZar(line.line_total_excl_cents)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
                    Update
                  </button>
                  <button type="submit" formAction={removeLine} className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline">
                    Remove
                  </button>
                </div>
              </form>
            ) : (
              <div key={line.id} className="flex justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{line.description}</span>
                  <span className="text-gray-500">
                    {Number(line.quantity)} {unitLabel(line.unit)} at {formatZar(line.unit_price_excl_cents)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatZar(line.line_total_excl_cents)}</span>
              </div>
            ),
          )}

          {editable && (
            <form action={addLine} className="flex flex-col gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4">
              <input type="hidden" name="documentId" value={doc.id} />
              <input name="description" placeholder="Add another line" className={input} />
              <div className="grid grid-cols-3 gap-2">
                <input name="quantity" defaultValue="1" inputMode="decimal" className={input} />
                <select name="unit" defaultValue="each" className={input}>
                  {CATALOGUE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <input name="unitPrice" inputMode="decimal" placeholder="Price" className={input} />
              </div>
              <button type="submit" className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Add
              </button>
            </form>
          )}
        </section>

        {editable && <IssueInvoiceButton documentId={doc.id} ready={rows.length > 0} />}

        {doc.public_token && (
          <>
            <ShareQuote
              documentId={doc.id}
              whatsappUrl={await whatsappLinkFor(
                doc.public_token,
                account.business_name,
                customerRow?.name ?? null,
                doc.total_incl_cents,
                customerRow?.whatsapp ?? null,
              )}
              publicUrl={publicUrl}
              defaultEmail={customerRow?.email ?? ""}
            />

            {doc.first_viewed_at && (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                Your customer opened this on{" "}
                {new Date(doc.first_viewed_at).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
            )}

            <RecordPaymentForm
              documentId={doc.id}
              outstandingLabel={
                outstanding <= 0
                  ? "This invoice is paid in full."
                  : `${formatZar(outstanding)} still outstanding of ${formatZar(doc.total_incl_cents)}.`
              }
            />

            {(payments ?? []).length > 0 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 text-sm shadow-sm">
                <h2 className="font-semibold text-ink">Payments received</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {(payments ?? []).map((p) => (
                    <li key={p.id} className="flex justify-between text-gray-600">
                      <span>
                        {p.paid_at} · {p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="font-medium text-ink">{formatZar(p.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="text-sm">
            <div className="text-gray-500">
              Subtotal {formatZar(doc.subtotal_excl_cents)}
              {vendor ? ` · VAT ${formatZar(doc.vat_amount_cents)}` : " · No VAT"}
            </div>
            <div className="text-lg font-bold text-ink">
              {formatZar(doc.total_incl_cents)}
              {paid > 0 && outstanding > 0 && (
                <span className="ml-2 text-xs font-medium text-gray-500">
                  {formatZar(outstanding)} outstanding
                </span>
              )}
              {outstanding <= 0 && doc.number && (
                <span className="ml-2 text-xs font-medium text-green-700">Paid</span>
              )}
            </div>
          </div>
          <a
            href={`/bizup/invoices/${doc.id}/pdf`}
            className="shrink-0 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            PDF
          </a>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
