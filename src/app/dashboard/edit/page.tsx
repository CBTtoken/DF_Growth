import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { EditPageClient } from "@/components/dashboard/EditPageClient";
import { SiteFooter } from "@/components/SiteFooter";

// Private, signed-in-only — see onboard/page.tsx for the same reasoning.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditPage() {
  const client = await requireGrowthClientId();

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
          <p className="text-sm text-gray-500">
            Use the magic link we sent you to get here — this page needs you to be signed in.
          </p>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const admin = createAdminClient();
  const [{ data: growthClient }, { data: landingPage }] = await Promise.all([
    admin
      .from("growth_clients")
      .select(
        "business_name, contact_email, call_phone, whatsapp_phone, province, industry, business_address, business_description, tagline, products_services, additional_notes, facebook_url, instagram_url, brand_primary_color, brand_secondary_color, logo_path, packages, slug"
      )
      .eq("id", client.id)
      .single(),
    admin
      .from("landing_pages")
      .select("headline, subheadline, about_text, services_text, cta_label")
      .eq("growth_client_id", client.id)
      .maybeSingle(),
  ]);

  if (!growthClient) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">No account found</h1>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const packages =
    (growthClient.packages as { name: string; price: string; description: string; type?: "package" | "special" | "discount" }[] | null) ?? [];
  const logoUrl = growthClient.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${growthClient.logo_path}`
    : null;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-6">
          <BrandHeader />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Edit your page</h1>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
            >
              ← Back to dashboard
            </Link>
          </div>
          {/* Combined spec Sec 22: was a muted one-line subtitle under the
              heading, easy to read as decorative rather than an actual
              behavioral notice — a real callout makes it clear this isn't
              a draft you publish later, every save here is instantly
              live. */}
          <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-gray-700">
            Everything you save on this screen is <span className="font-semibold">immediately visible</span> on
            your live public page, there&apos;s no separate publish step.
          </p>
        </div>

        <EditPageClient
          initialData={{
            businessName: growthClient.business_name ?? "",
            contactEmail: growthClient.contact_email ?? "",
            callPhone: growthClient.call_phone ?? "",
            whatsappPhone: growthClient.whatsapp_phone ?? "",
            province: growthClient.province ?? "",
            industry: growthClient.industry ?? "",
            businessAddress: growthClient.business_address ?? "",
            businessDescription: growthClient.business_description ?? "",
            tagline: growthClient.tagline ?? "",
            productsServices: growthClient.products_services ?? "",
            additionalNotes: growthClient.additional_notes ?? "",
            facebookUrl: growthClient.facebook_url ?? "",
            instagramUrl: growthClient.instagram_url ?? "",
            brandPrimaryColor: growthClient.brand_primary_color ?? "#1081b8",
            brandSecondaryColor: growthClient.brand_secondary_color ?? "#ffffff",
            logoUrl,
            headline: landingPage?.headline ?? "",
            subheadline: landingPage?.subheadline ?? "",
            aboutText: landingPage?.about_text ?? "",
            servicesText: landingPage?.services_text ?? "",
            ctaLabel: landingPage?.cta_label ?? "",
            packages,
          }}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
