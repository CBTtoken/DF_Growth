import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomer } from "@/app/bizup/customers/actions";
import { CustomerForm } from "@/components/bizup/CustomerForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewBizUpCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/bizup/login");

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <Link
          href="/bizup/customers"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to customers
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Add a customer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Only the name is required. You can fill in the rest whenever you have it.
          </p>
          <div className="mt-6">
            <CustomerForm action={createCustomer} submitLabel="Save customer" next={next} />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
