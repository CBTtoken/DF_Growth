import type { Metadata } from "next";
import { bizupLoginPath, isKatisoBizHost } from "@/lib/bizup/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, loadSettings } from "@/lib/bizup/documents";
import { addLine, updateLine, removeLine, setRateType, saveLineToPriceList } from "@/app/bizup/quotes/actions";
import { whatsappLinkFor } from "@/app/bizup/quotes/send-actions";
import { updateInvoiceCustomer } from "@/app/bizup/invoices/actions";
import { IssueInvoiceButton, RecordPaymentForm } from "@/components/bizup/InvoiceActions";
import { ShareQuote } from "@/components/bizup/ShareQuote";
import { formatZar } from "@/lib/bizup/money";
import { isVatVendor, taxInvoiceLevel, FULL_TAX_INVOICE_NOTICE, documentTitle } from "@/lib/bizup/vat";
import { CATALOGUE_UNITS } from "@/lib/bizup/schemas";
import { asRateType, priceForRate, rateLabel, RATE_TYPES } from "@/lib/bizup/rates";
import { PriceListPicker } from "@/components/bizup/PriceListPicker";
import { CustomerPicker } from "@/components/bizup/CustomerPicker";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default async function BizUpInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const [{ data: doc }, { data: lines }, { data: payments }, { data: customers }, { data: priceList }, settings] = await Promise.all([
    admin
      .from("bizup_documents")
      .select("*, bizup_customers(name, email, whatsapp)")
      .eq("id", id)
      .eq("account_id", account.id)
      .eq("doc_type", "invoice")
      .maybeSingle(),
    admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
    admin.from("bizup_payments").select("*").eq("document_id", id).order("paid_at"),
    admin.from("bizup_customers").select("id, name").eq("account_id", account.id).order("name"),
    admin
      .from("bizup_catalogue_items")
      .select("id, name, unit, unit_price_excl_cents, insurance_price_excl_cents, default_markup_pct, markup_type, default_markup_amount_cents")
      .eq("account_id", account.id)
      .eq("active", true)
      .order("name"),
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
  const rateType = asRateType(doc.rate_type);
  const insurancePricing = account.insurance_pricing_enabled;

  const customerRow = doc.bizup_customers as unknown as {
    name: string;
    email: string | null;
    whatsapp: string | null;
  } | null;

  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const publicUrl = doc.public_token
    ? `${host.startsWith("localhost") ? "http" : "https"}://${host}${
        isKatisoBizHost(host) ? "" : "/bizup"
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

        {/* Who it is for. Missing entirely until Dewald converted a quote
            and was told to choose a customer on a page with nowhere to do
            it. An invoice can arrive here without one two ways: converted
            from a quote that never had a customer, or created directly,
            which starts empty by definition. */}
        {editable && (
          <form
            action={updateInvoiceCustomer}
            className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="documentId" value={doc.id} />
            <CustomerPicker
              customers={customers ?? []}
              selectedId={doc.customer_id}
              label="Who is this invoice for?"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand"
              >
                Save customer
              </button>
              {/* Comes straight back here afterwards, so adding someone new
                  mid-invoice does not lose the invoice. */}
              <Link
                href={`/bizup/customers/new?next=${encodeURIComponent(`/bizup/invoices/${doc.id}`)}`}
                className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
              >
                Add a new customer
              </Link>
            </div>
          </form>
        )}

        {level === "full" && editable && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {FULL_TAX_INVOICE_NOTICE}
          </p>
        )}

        {/* Same control as the quote. An invoice converted from a quote
            arrives with the quote's rate already set; one raised directly
            starts on private and can be switched here. */}
        {insurancePricing && (
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Which rates apply</h2>
            {editable ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {RATE_TYPES.map((rate) => (
                    <form key={rate} action={setRateType}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="rateType" value={rate} />
                      <button
                        type="submit"
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                          rate === rateType
                            ? "bg-brand text-white"
                            : "border border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"
                        }`}
                      >
                        {rateLabel(rate)}
                      </button>
                    </form>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Switching this re-prices every line that came from your price list. Lines you
                  typed in yourself are left alone.
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600">{rateLabel(rateType)}</p>
            )}
          </section>
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
                <div className="flex flex-wrap gap-3">
                  {/* Same as the quote builder: a line typed by hand can be
                      kept, and one already from the price list cannot be
                      added twice. */}
                  {!line.catalogue_item_id && (
                    <button
                      type="submit"
                      formAction={saveLineToPriceList}
                      className="order-2 text-sm font-semibold text-gray-600 underline-offset-2 hover:text-brand hover:underline"
                    >
                      Save to price list
                    </button>
                  )}
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

          {/* The invoice page never had the price list at all, so an invoice
              raised directly meant typing every line by hand even when the
              prices were already saved. */}
          {editable && (priceList ?? []).length > 0 && (
            <PriceListPicker
              documentId={doc.id}
              items={(priceList ?? []).map((item) => ({
                id: item.id,
                name: item.name,
                priceLabel: formatZar(priceForRate(item, rateType)),
                unitLabel: unitLabel(item.unit),
              }))}
            />
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

        {/* Money taken before the invoice was written. Optional and easy to
            walk past: a member who was paid nothing up front just carries on
            to the button below. What is recorded here shows on the invoice
            as a deduction from the total, so the customer sees the balance
            rather than being asked again for money they have handed over. */}
        {editable && (
          <>
            {paid > 0 && (
              <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">
                  {formatZar(paid)} already received on this job.
                </p>
                <p className="mt-1">
                  The invoice will show the full {formatZar(doc.total_incl_cents)}, then deduct
                  this, leaving {formatZar(Math.max(0, doc.total_incl_cents - paid))} to pay.
                </p>
              </section>
            )}
            <RecordPaymentForm
              documentId={doc.id}
              deposit
              outstandingAmount=""
              outstandingLabel="If they paid a deposit or gave you cash before this invoice, add it here. Skip this if they have not paid anything yet."
            />
          </>
        )}

        {editable && <IssueInvoiceButton documentId={doc.id} ready={rows.length > 0} />}

        {/* Sec 7: one button, on any issued invoice, and it is the only way
            in. There is deliberately no inline edit anywhere on this page
            once a number exists, so a correction cannot happen by accident. */}
        {doc.number && !["cancelled", "credited", "corrected"].includes(doc.status) && (
          <Link
            href={`/bizup/invoices/${doc.id}/fix`}
            className="self-start rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
          >
            Fix this invoice
          </Link>
        )}

        {doc.status === "corrected" && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            This version has been corrected. The corrected invoice keeps the same number and date.
          </p>
        )}
        {doc.status === "cancelled" && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            This invoice was cancelled with a credit note. Both are kept in your records.
          </p>
        )}
        {doc.status === "credited" && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            This invoice was replaced.{" "}
            {doc.superseded_by_id && (
              <Link href={`/bizup/invoices/${doc.superseded_by_id}`} className="font-semibold text-brand underline-offset-2 hover:underline">
                See the invoice that replaced it
              </Link>
            )}
          </p>
        )}

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
              outstandingAmount={(Math.max(0, outstanding) / 100).toFixed(2)}
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
