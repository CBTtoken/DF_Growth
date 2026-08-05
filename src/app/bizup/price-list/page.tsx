import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatZar } from "@/lib/bizup/money";
import { CATALOGUE_UNITS, CATALOGUE_TYPES } from "@/lib/bizup/schemas";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 15.3. Called "price list" to the
// member, matching Sec 11's own wording.
export default async function BizUpPriceListPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

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

  const { data: items, error } = await admin
    .from("bizup_catalogue_items")
    .select("id, name, type, unit, unit_price_excl_cents, default_markup_pct, active")
    .eq("account_id", account.id)
    .eq("active", !showArchived)
    .order("name");

  // Checked rather than assumed: a failed query and an empty price list
  // both render as nothing, and "you have no prices saved" is a misleading
  // thing to tell someone whose query broke.
  if (error) console.error("KatisoBiz price list query failed", error);

  const rows = items ?? [];
  const unitLabel = (u: string) => CATALOGUE_UNITS.find((x) => x.value === u)?.label ?? u;
  const typeLabel = (t: string) => CATALOGUE_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href="/bizup"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to KatisoBiz
        </Link>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {showArchived ? "Archived prices" : "Price list"}
          </h1>
          <Link
            href="/bizup/price-list/new"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Add a price
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              {showArchived
                ? "Nothing archived."
                : "Nothing saved yet, and that is fine. You can type any line straight into a quote and save it here afterwards."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/bizup/price-list/${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-ink">{item.name}</span>
                    <span className="text-sm text-gray-500">
                      {typeLabel(item.type)}
                      {item.default_markup_pct ? ` • ${item.default_markup_pct}% markup` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-ink">
                      {formatZar(item.unit_price_excl_cents)}
                    </span>
                    <span className="block text-xs text-gray-500">{unitLabel(item.unit)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={showArchived ? "/bizup/price-list" : "/bizup/price-list?archived=1"}
          className="self-start text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          {showArchived ? "Back to your price list" : "See archived prices"}
        </Link>

        {!showArchived && (
          <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            Your price list is a shortcut, never a requirement. You can always type a one-off line
            into a quote without saving it here.
          </p>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
