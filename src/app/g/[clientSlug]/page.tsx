import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConversionHero } from "@/components/landing/ConversionHero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { LeadForm } from "@/components/landing/LeadForm";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesList } from "@/components/landing/ServicesList";
import { LocationMap } from "@/components/landing/LocationMap";
import { PackagesSection } from "@/components/landing/PackagesSection";
import { StorySection } from "@/components/landing/StorySection";
import { ensureContrast } from "@/lib/color";

// CLAUDE.md Section 7.1 — every client, including the pilot, is served
// through this one route by slug, never a hardcoded page. params is a
// Promise in this Next.js version (14 and earlier had it synchronous, which
// is what the spec's own sample code assumed).
//
// Cached at the edge and revalidated every 60s rather than re-querying
// Supabase on every visit: a marketing page's content only changes when the
// client edits it, and repeat cold Vercel-function executions were the
// single biggest source of LCP variance in testing (a cold run measured 8.9s
// LCP against a warm ~2.3s for the identical page).
export const revalidate = 60;

export default async function ClientLandingPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, contact_email, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();

  if (!client) return notFound();

  // landing_pages and testimonials don't depend on each other — running them
  // sequentially was adding a full extra network round-trip to the time
  // before the hero could render (confirmed via Lighthouse: this route's LCP
  // element render delay was ~1.8s higher than a page with no DB calls at
  // all, roughly what one extra serial Supabase round-trip costs).
  const [{ data: landingPage }, { data: testimonials }] = await Promise.all([
    admin
      .from("landing_pages")
      .select("id, headline, subheadline, about_text, services_text, cta_label")
      .eq("growth_client_id", client.id)
      .eq("published", true)
      .single(),
    admin.from("testimonials").select("id, author_name, quote, rating").eq("growth_client_id", client.id).limit(5),
  ]);

  if (!landingPage) return notFound();

  // Defensive fallback only — the wizard requires a color before a client
  // can publish, so this shouldn't normally be hit. Was FortisLex's navy
  // (unrelated project, copy-paste leftover); DigitalFlyer's own blue is at
  // least the right company if this path is ever actually reached.
  const primaryColor = client.brand_primary_color ?? "#1081b8";
  const secondaryColor = client.brand_secondary_color ?? "#ffffff";

  // The client's raw color is only ever safe to use as a BACKGROUND (hero,
  // lead-form section, CTA buttons) — readableTextOn() already picks a safe
  // white/dark text color for those. Every section below renders on a white
  // card/page background instead, using the brand color as small text/icon
  // color directly — found live during testing that a light client color
  // (e.g. bright yellow) is then nearly invisible there. This variant is
  // guaranteed readable on white specifically, for exactly those uses.
  const accentColor = ensureContrast(primaryColor, "#ffffff");

  const packages = (client.packages as { name: string; price: string; description: string }[] | null) ?? [];

  const logoUrl = client.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${client.logo_path}`
    : null;

  // Numbered eyebrows ("01 — About", "02 — What we offer", ...) only count
  // sections that actually have content, so a client missing e.g. packages
  // or testimonials still sees a clean sequence instead of a gap (01, 02,
  // 04 — skipping 03 would read as a bug, not as "this section doesn't
  // apply to this client").
  const hasAbout = Boolean(landingPage.about_text);
  const hasStory = Boolean(client.additional_notes);
  const hasServices = Boolean(landingPage.services_text?.trim());
  const hasPackages = packages.length > 0;
  const hasTestimonials = (testimonials?.length ?? 0) > 0;
  const hasLocation = Boolean(client.business_address) && client.business_address !== "Online";

  let sectionCount = 0;
  const nextNumber = (present: boolean) => (present ? String(++sectionCount).padStart(2, "0") : "");
  const aboutNumber = nextNumber(hasAbout);
  const storyNumber = nextNumber(hasStory);
  const servicesNumber = nextNumber(hasServices);
  const packagesNumber = nextNumber(hasPackages);
  const trustNumber = nextNumber(hasTestimonials);
  const locationNumber = nextNumber(hasLocation);

  return (
    <main>
      <FbclidCapture />
      <ConversionHero
        businessName={client.business_name}
        tagline={client.tagline}
        logoUrl={logoUrl}
        headline={landingPage.headline}
        subheadline={landingPage.subheadline ?? ""}
        ctaLabel={landingPage.cta_label}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        facebookUrl={client.facebook_url}
        instagramUrl={client.instagram_url}
      />
      <ScrollReveal>
        <AboutSection
          businessName={client.business_name}
          tagline={client.tagline}
          aboutText={landingPage.about_text}
          accentColor={accentColor}
          eyebrowNumber={aboutNumber}
        />
      </ScrollReveal>
      <ScrollReveal>
        <StorySection storyText={client.additional_notes} accentColor={accentColor} eyebrowNumber={storyNumber} />
      </ScrollReveal>
      <ScrollReveal>
        <ServicesList
          servicesText={landingPage.services_text}
          accentColor={accentColor}
          eyebrowNumber={servicesNumber}
        />
      </ScrollReveal>
      <ScrollReveal>
        <PackagesSection
          packages={packages}
          ctaLabel={landingPage.cta_label}
          accentColor={accentColor}
          eyebrowNumber={packagesNumber}
        />
      </ScrollReveal>
      <ScrollReveal>
        <TrustBadges testimonials={testimonials ?? []} accentColor={accentColor} eyebrowNumber={trustNumber} />
      </ScrollReveal>
      <ScrollReveal>
        <LocationMap
          businessAddress={client.business_address}
          accentColor={accentColor}
          eyebrowNumber={locationNumber}
        />
      </ScrollReveal>
      <ScrollReveal>
        <LeadForm
          growthClientId={client.id}
          landingPageId={landingPage.id}
          pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/g/${clientSlug}`}
          primaryColor={primaryColor}
          contactEmail={client.contact_email}
          businessName={client.business_name}
        />
      </ScrollReveal>
      <footer className="bg-white py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {client.business_name} ·{" "}
        <a href="/dashboard" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Manage this page
        </a>
      </footer>
    </main>
  );
}
