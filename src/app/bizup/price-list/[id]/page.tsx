import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCatalogueItem, setCatalogueItemActive } from "@/app/bizup/price-list/actions";
import { PriceListItemForm } from "@/components/bizup/PriceListItemForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditPriceListItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  const { data: item } = await admin
    .from("bizup_catalogue_items")
    .select("*")
    .eq("id", id)
    // Scoped to the caller's own account as well as the id. This runs with
    // the service role and bypasses RLS, so without this a member could
    // read another member's prices by guessing a uuid.
    .eq("account_id", account.id)
    .maybeSingle();

  if (!item) notFound();

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <Link
          href="/bizup/price-list"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to your price list
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">{item.name}</h1>
          {!item.active && (
            <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              This one is archived, so it will not appear when you build a quote. Quotes that
              already used it are unchanged.
            </p>
          )}
          <div className="mt-6">
            <PriceListItemForm
              action={updateCatalogueItem}
              submitLabel="Save changes"
              defaults={{
                id: item.id,
                name: item.name,
                description: item.description,
                type: item.type,
                unit: item.unit,
                unitPriceExclCents: item.unit_price_excl_cents,
                defaultMarkupPct: item.default_markup_pct,
              }}
            />
          </div>
        </div>

        {/* Archive rather than delete. A price that is no longer offered
            still appears on every quote that used it, and losing it would
            mean losing the record of having offered it. */}
        <form
          action={setCatalogueItemActive}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="active" value={item.active ? "false" : "true"} />
          <p className="text-sm font-semibold text-ink">
            {item.active ? "Stop offering this" : "Offer this again"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {item.active
              ? "It disappears from new quotes but stays on every document that already used it."
              : "It goes back into your price list and can be added to new quotes."}
          </p>
          <button
            type="submit"
            className="mt-3 text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {item.active ? "Archive this price" : "Restore this price"}
          </button>
        </form>
      </div>
      <SiteFooter />
    </main>
  );
}
