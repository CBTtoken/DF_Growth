import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConversionHero } from "@/components/landing/ConversionHero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { LeadForm } from "@/components/landing/LeadForm";

// CLAUDE.md Section 7.1 — every client, including the pilot, is served
// through this one route by slug, never a hardcoded page. params is a
// Promise in this Next.js version (14 and earlier had it synchronous, which
// is what the spec's own sample code assumed).
export default async function ClientLandingPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("growth_clients")
    .select("id, business_name, brand_primary_color, brand_secondary_color")
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();

  if (!client) return notFound();

  const { data: landingPage } = await admin
    .from("landing_pages")
    .select("id, headline, subheadline, cta_label")
    .eq("growth_client_id", client.id)
    .eq("published", true)
    .single();

  if (!landingPage) return notFound();

  const { data: testimonials } = await admin
    .from("testimonials")
    .select("id, author_name, quote, rating")
    .eq("growth_client_id", client.id)
    .limit(5);

  const primaryColor = client.brand_primary_color ?? "#0f2d52";
  const secondaryColor = client.brand_secondary_color ?? "#ffffff";

  return (
    <main>
      <ConversionHero
        businessName={client.business_name}
        headline={landingPage.headline}
        subheadline={landingPage.subheadline ?? ""}
        ctaLabel={landingPage.cta_label}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
      <TrustBadges testimonials={testimonials ?? []} />
      <LeadForm
        growthClientId={client.id}
        landingPageId={landingPage.id}
        primaryColor={primaryColor}
      />
    </main>
  );
}
