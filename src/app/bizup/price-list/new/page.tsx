import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCatalogueItem } from "@/app/bizup/price-list/actions";
import { PriceListItemForm } from "@/components/bizup/PriceListItemForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewPriceListItemPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, insurance_pricing_enabled")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

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
          <h1 className="text-xl font-bold tracking-tight text-ink">Add a price</h1>
          <p className="mt-1 text-sm text-gray-500">
            Something you charge for often, so you do not have to type it again every time.
          </p>
          <div className="mt-6">
            <PriceListItemForm
              action={createCatalogueItem}
              submitLabel="Save to my price list"
              insurancePricing={account.insurance_pricing_enabled}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
