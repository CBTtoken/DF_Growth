import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { ClientLandingPageView } from "@/components/landing/ClientLandingPageView";
import { BrandHeader } from "@/components/brand/BrandHeader";

// Combined spec Sec 6 (live page preview): an authenticated preview of the
// client's own current data, reusing the exact same rendering path as the
// real public page (ClientLandingPageView) rather than a second, easy-to-
// drift copy of it. Works regardless of published/active status — a
// mid-onboarding client can preview before they've ever gone live, unlike
// /[slug] which requires both. Also accepts ?template=X so the template
// picker (Sec 9) can show "what would my own page look like in this
// template" without saving that choice first.
//
// Private, signed-in-only — never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: templateOverride } = await searchParams;
  const client = await requireGrowthClientId();

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Please log in</h1>
          <p className="text-sm text-gray-500">This page needs you to be signed in.</p>
          <Link href="/login" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url, website_url, template, industry, city, meta_pixel_id, hero_photo_id, slug, booking_enabled"
    )
    .eq("id", client.id)
    .single();

  if (!growthClient) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">No account found</h1>
        </div>
      </main>
    );
  }

  const [{ data: landingPage }, { data: testimonials }, { data: photos }, { data: bookableUnits }, { data: bookingRules }] =
    await Promise.all([
      // No .eq("published", true) here, unlike the real public page — a
      // client mid-onboarding, or one who's editing a draft, still gets a
      // preview of what they've saved so far.
      admin
        .from("landing_pages")
        .select("id, headline, subheadline, about_text, services_text, cta_label")
        .eq("growth_client_id", client.id)
        .maybeSingle(),
      admin.from("testimonials").select("id, author_name, quote, rating").eq("growth_client_id", client.id).limit(5),
      admin
        .from("client_photos")
        .select("id, storage_path")
        .eq("growth_client_id", client.id)
        .order("position", { ascending: true }),
      admin
        .from("bookable_units")
        .select("id, name, unit_type, description, base_price_cents, capacity, duration_minutes")
        .eq("growth_client_id", client.id)
        .eq("is_active", true)
        .order("position", { ascending: true }),
      admin
        .from("booking_operational_rules")
        .select("operating_hours, buffer_minutes")
        .eq("growth_client_id", client.id)
        .maybeSingle(),
    ]);

  if (!landingPage) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Not enough to preview yet</h1>
          <p className="text-sm text-gray-500">
            Add your landing page headline and copy first — once that&apos;s saved, your preview will show up here.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ClientLandingPageView
      client={growthClient}
      landingPage={landingPage}
      testimonials={testimonials ?? []}
      photos={photos ?? []}
      bookableUnits={bookableUnits ?? []}
      bookingRules={bookingRules ?? null}
      clientSlug={growthClient.slug}
      mode="preview"
      templateOverride={templateOverride}
    />
  );
}
