import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBizUpAccount } from "@/app/bizup/actions";
import { TemplatePicker } from "@/components/bizup/TemplatePicker";
import { BusinessProfileForm } from "@/components/bizup/BusinessProfileForm";
import { isVatVendor } from "@/lib/bizup/vat";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 15.1, editing the profile after
// setup. Same form component as /bizup/start, different Server Action, so
// the two screens cannot drift apart in what they collect.
export default async function BizUpBusinessSettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/bizup/login");

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select(
      "business_name, trading_name, registration_number, vat_number, address_line1, address_line2, city, province, postal_code, email, phone, whatsapp, financial_year_end_month, template_id"
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!account) redirect("/bizup/start");

  const vendor = isVatVendor(account.vat_number);
  const templateId = account.template_id;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
        <Link href="/bizup" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to BizUp
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Business details</h1>

          {/* Sec 3.1: the member should always be able to see, in plain
              words, which way their documents are being issued. This is the
              single setting that decides it. */}
          <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            {vendor
              ? "You are set up as a VAT vendor, so your documents are titled Tax Invoice and include 15% VAT."
              : "You are not set up as a VAT vendor, so your documents are titled Invoice and no VAT is charged."}
          </p>

          <div className="mt-6">
            <BusinessProfileForm
              action={updateBizUpAccount}
              defaults={{
                businessName: account.business_name,
                tradingName: account.trading_name,
                registrationNumber: account.registration_number,
                vatNumber: account.vat_number,
                addressLine1: account.address_line1,
                addressLine2: account.address_line2,
                city: account.city,
                province: account.province,
                postalCode: account.postal_code,
                email: account.email,
                phone: account.phone,
                whatsapp: account.whatsapp,
                financialYearEndMonth: account.financial_year_end_month,
              }}
              submitLabel="Save changes"
            />
          </div>
        </div>
        {/* Sec 10: choice is per account, changeable at any time, and
            applies to future documents only. Documents already issued keep
            the template they were sent with. */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">How your documents look</h2>
          <p className="mt-1 text-sm text-gray-500">
            Changing this affects new documents only. Anything you have already sent stays exactly
            as your customer received it.
          </p>
          <div className="mt-5">
            <TemplatePicker current={templateId} />
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
