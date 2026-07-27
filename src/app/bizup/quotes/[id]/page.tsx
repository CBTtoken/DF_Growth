import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, loadSettings } from "@/lib/bizup/documents";
import { addLine, updateLine, removeLine, updateQuoteMeta, deleteDraftQuote } from "@/app/bizup/quotes/actions";
import { whatsappLinkFor } from "@/app/bizup/quotes/send-actions";
import { setQuoteOutcome, convertToInvoice } from "@/app/bizup/quotes/convert-actions";
import { IssueQuoteButton, ShareQuote } from "@/components/bizup/ShareQuote";
import { headers } from "next/headers";
import { formatZar } from "@/lib/bizup/money";
import {
  isVatVendor,
  taxInvoiceLevel,
  FULL_TAX_INVOICE_NOTICE,
  documentTitle,
} from "@/lib/bizup/vat";
import { CATALOGUE_UNITS } from "@/lib/bizup/schemas";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default async function BizUpQuoteBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const [{ data: doc }, { data: lines }, { data: customers }, { data: priceList }, settings] =
    await Promise.all([
      admin
        .from("bizup_documents")
        .select("*")
        .eq("id", id)
        // Scoped to this account as well as the id: this runs with the
        // service role and bypasses RLS.
        .eq("account_id", account.id)
        .maybeSingle(),
      admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
      admin.from("bizup_customers").select("id, name").eq("account_id", account.id).order("name"),
      admin
        .from("bizup_catalogue_items")
        .select("id, name, unit, unit_price_excl_cents, default_markup_pct")
        .eq("account_id", account.id)
        .eq("active", true)
        .order("name"),
      loadSettings(),
    ]);

  if (!doc) notFound();

  // The chosen customer's own contact details, for the WhatsApp deep link
  // and the email field. Fetched separately from the picker list above,
  // which only needs names.
  const { data: customerRow } = doc.customer_id
    ? await admin
        .from("bizup_customers")
        .select("name, email, whatsapp, phone")
        .eq("id", doc.customer_id)
        .eq("account_id", account.id)
        .maybeSingle()
    : { data: null };

  // Same prefix rule as send-actions.ts: KatisoBiz's own hostname serves the
  // short /d/... link, anywhere else needs the full path.
  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const publicUrl = doc.public_token
    ? `${host.startsWith("localhost") ? "http" : "https"}://${host}${
        host.split(":")[0].toLowerCase().startsWith("bizup.") ? "" : "/bizup"
      }/d/${doc.public_token}`
    : "";

  const vendor = isVatVendor(account.vat_number);
  const editable = doc.number === null && doc.status === "draft";
  const rows = lines ?? [];

  // Sec 3.2: the R5,000 notice appears while the document is still being
  // built, as soon as a vendor's running total crosses the threshold.
  const level = taxInvoiceLevel(doc.total_incl_cents, settings, vendor);
  const unitLabel = (u: string) => CATALOGUE_UNITS.find((x) => x.value === u)?.label ?? u;

  return (
    <main className="flex flex-1 flex-col bg-gray-50 pb-32">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href="/bizup/quotes" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to quotes
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {doc.number ?? `${documentTitle("quote", vendor)} (draft)`}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {vendor
              ? "You are a VAT vendor, so this quote shows the VAT inclusive total."
              : "You are not a VAT vendor, so no VAT is added."}
          </p>
        </div>

        {/* Who it is for, and how long it stands */}
        <form action={updateQuoteMeta} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="documentId" value={doc.id} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Customer
            <select name="customerId" defaultValue={doc.customer_id ?? ""} className={input} disabled={!editable}>
              <option value="">Not chosen yet</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Valid until
            <input type="date" name="validUntil" defaultValue={doc.valid_until ?? ""} className={input} disabled={!editable} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Notes for your customer
            <textarea name="notes" defaultValue={doc.notes ?? ""} rows={2} className={input} disabled={!editable} />
          </label>
          {editable && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="self-start rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
                Save details
              </button>
              {/* The invoice page had this and the quote page did not, which
                  is backwards: the quote is where a member meets a new
                  customer for the first time. Found by walking the flow end
                  to end rather than by testing the page on its own. Returns
                  here afterwards so adding someone does not lose the quote. */}
              <Link
                href={`/bizup/customers/new?next=${encodeURIComponent(`/bizup/quotes/${doc.id}`)}`}
                className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
              >
                Add a new customer
              </Link>
            </div>
          )}
        </form>

        {level === "full" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {FULL_TAX_INVOICE_NOTICE}
          </p>
        )}

        {/* Lines */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">What you are quoting for</h2>

          {rows.length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
              Nothing on this quote yet. Tap something from your price list, or type a one-off line.
            </p>
          )}

          {rows.map((line) => (
            <form key={line.id} action={updateLine} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="lineId" value={line.id} />
              <input name="description" defaultValue={line.description} className={input} disabled={!editable} />
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
                  Qty
                  <input name="quantity" defaultValue={Number(line.quantity)} inputMode="decimal" className={input} disabled={!editable} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
                  Price ({unitLabel(line.unit)})
                  <input
                    name="unitPrice"
                    defaultValue={(line.unit_price_excl_cents / 100).toFixed(2)}
                    inputMode="decimal"
                    className={input}
                    disabled={!editable}
                  />
                </label>
                <span className="flex flex-col gap-1 text-xs font-medium text-gray-500">
                  Line total
                  <span className="py-2.5 text-base font-semibold text-ink">
                    {formatZar(line.line_total_excl_cents)}
                  </span>
                </span>
              </div>
              {editable && (
                <div className="flex gap-3">
                  <button type="submit" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
                    Update
                  </button>
                  <button
                    type="submit"
                    formAction={removeLine}
                    className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </form>
          ))}
        </section>

        {editable && (
          <>
            {/* Sec 9: price list items as tappable chips, so a common line is
                one tap rather than three fields. */}
            {(priceList ?? []).length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-ink">From your price list</h2>
                <div className="flex flex-wrap gap-2">
                  {(priceList ?? []).map((item) => (
                    <form key={item.id} action={addLine}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="catalogueItemId" value={item.id} />
                      <input type="hidden" name="quantity" value="1" />
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand hover:text-brand"
                      >
                        {item.name} · {formatZar(item.unit_price_excl_cents)}
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            )}

            {/* Sec 11: a member must always be able to type a one-off line
                without touching the price list. */}
            <form action={addLine} className="flex flex-col gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4">
              <input type="hidden" name="documentId" value={doc.id} />
              <h2 className="text-sm font-semibold text-ink">Add a one-off line</h2>
              <input name="description" placeholder="What you are charging for" className={input} />
              <div className="grid grid-cols-3 gap-2">
                <input name="quantity" defaultValue="1" inputMode="decimal" placeholder="Qty" className={input} />
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
                Add to quote
              </button>
            </form>

            {/* Sec 15: the block happens here, at send, never at create. A
                member with no allowance left can still build this whole
                quote, they simply cannot issue it yet. */}
            <IssueQuoteButton documentId={doc.id} ready={rows.length > 0} />

            <form action={deleteDraftQuote}>
              <input type="hidden" name="documentId" value={doc.id} />
              <button type="submit" className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline">
                Discard this draft
              </button>
            </form>
          </>
        )}

        {doc.public_token && (
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
        )}

        {/* Sec 6: the customer has no login, so the member records what
            happened. Only offered once the quote actually exists. */}
        {doc.number && (doc.status === "sent" || doc.status === "accepted" || doc.status === "declined") && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">What did your customer say?</h2>
            <div className="flex flex-wrap gap-2">
              <form action={setQuoteOutcome}>
                <input type="hidden" name="documentId" value={doc.id} />
                <input type="hidden" name="outcome" value="accepted" />
                <button
                  type="submit"
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    doc.status === "accepted"
                      ? "bg-green-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"
                  }`}
                >
                  They accepted
                </button>
              </form>
              <form action={setQuoteOutcome}>
                <input type="hidden" name="documentId" value={doc.id} />
                <input type="hidden" name="outcome" value="declined" />
                <button
                  type="submit"
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    doc.status === "declined"
                      ? "bg-gray-700 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"
                  }`}
                >
                  They said no
                </button>
              </form>
            </div>

            {doc.status === "accepted" && (
              <form action={convertToInvoice} className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                <input type="hidden" name="documentId" value={doc.id} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-dark"
                >
                  Turn this into an invoice
                </button>
                <p className="text-xs text-gray-500">
                  Opens as a draft with the same lines, so you can adjust for what was actually done
                  before you send it.
                </p>
              </form>
            )}
          </div>
        )}

        {doc.status === "converted" && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            This quote has been turned into an invoice.{" "}
            <Link href="/bizup/invoices" className="font-semibold text-brand underline-offset-2 hover:underline">
              See your invoices
            </Link>
          </p>
        )}

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
      </div>

      {/* Sec 9: the running total pinned to the bottom, with the VAT state
          visible at all times rather than only on the finished document. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="text-sm">
            <div className="text-gray-500">
              Subtotal {formatZar(doc.subtotal_excl_cents)}
              {vendor ? ` · VAT ${formatZar(doc.vat_amount_cents)}` : " · No VAT"}
            </div>
            <div className="text-lg font-bold text-ink">
              {formatZar(doc.total_incl_cents)}
              <span className="ml-1 text-xs font-medium text-gray-500">
                {vendor ? "incl. VAT" : "total"}
              </span>
            </div>
          </div>
          <a
            href={`/bizup/quotes/${doc.id}/pdf`}
            className="shrink-0 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            Preview PDF
          </a>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
