import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCustomer, deleteCustomer } from "@/app/bizup/customers/actions";
import { CustomerForm } from "@/components/bizup/CustomerForm";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditBizUpCustomerPage({
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

  const { data: customer } = await admin
    .from("bizup_customers")
    .select("*")
    .eq("id", id)
    // Scoped to the caller's own account as well as the id. This query runs
    // with the service role and bypasses RLS, so without this a member
    // could read another member's customer by guessing a uuid.
    .eq("account_id", account.id)
    .maybeSingle();

  if (!customer) notFound();

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
          <h1 className="text-xl font-bold tracking-tight text-ink">{customer.name}</h1>
          <div className="mt-6">
            <CustomerForm
              action={updateCustomer}
              submitLabel="Save changes"
              defaults={{
                id: customer.id,
                name: customer.name,
                isBusiness: customer.is_business,
                registrationNumber: customer.registration_number,
                vatNumber: customer.vat_number,
                email: customer.email,
                phone: customer.phone,
                whatsapp: customer.whatsapp,
                addressLine1: customer.address_line1,
                addressLine2: customer.address_line2,
                city: customer.city,
                province: customer.province,
                postalCode: customer.postal_code,
                notes: customer.notes,
              }}
            />
          </div>
        </div>

        <form action={deleteCustomer} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <input type="hidden" name="id" value={customer.id} />
          <p className="text-sm font-semibold text-ink">Remove this customer</p>
          <p className="mt-1 text-sm text-gray-500">
            You can only do this while they have no invoices or quotes. Documents you have already
            issued have to be kept.
          </p>
          <button
            type="submit"
            className="mt-3 text-sm font-semibold text-red-600 underline-offset-2 hover:underline"
          >
            Remove {customer.name}
          </button>
        </form>
      </div>
      <SiteFooter />
    </main>
  );
}
