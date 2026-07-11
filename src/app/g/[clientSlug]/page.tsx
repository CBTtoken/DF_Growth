import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { OwnerBar } from "@/components/landing/OwnerBar";
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
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { MinimalHero } from "@/components/landing/heroes/MinimalHero";
import { SplitHero } from "@/components/landing/heroes/SplitHero";
import { EditorialHero } from "@/components/landing/heroes/EditorialHero";
import { DarkHero } from "@/components/landing/heroes/DarkHero";
import { CompactHero } from "@/components/landing/heroes/CompactHero";
import { GeometricHero } from "@/components/landing/heroes/GeometricHero";
import { ChecklistHero } from "@/components/landing/heroes/ChecklistHero";
import { ensureContrast } from "@/lib/color";
import { getTemplate, type SectionKey } from "@/lib/templates/registry";
import { getIndustryPhoto } from "@/lib/images/pexels";

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
      "id, business_name, contact_email, contact_phone, brand_primary_color, brand_secondary_color, tagline, business_address, packages, logo_path, additional_notes, facebook_url, instagram_url, template, industry"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .single();

  if (!client) return notFound();

  // landing_pages, testimonials, and the visitor's own auth session don't
  // depend on each other — running them sequentially was adding a full
  // extra network round-trip to the time before the hero could render
  // (confirmed via Lighthouse: this route's LCP element render delay was
  // ~1.8s higher than a page with no DB calls at all, roughly what one
  // extra serial Supabase round-trip costs).
  const supabase = await createServerClient();
  const [{ data: landingPage }, { data: testimonials }, { data: authData }] = await Promise.all([
    admin
      .from("landing_pages")
      .select("id, headline, subheadline, about_text, services_text, cta_label")
      .eq("growth_client_id", client.id)
      .eq("published", true)
      .single(),
    admin.from("testimonials").select("id, author_name, quote, rating").eq("growth_client_id", client.id).limit(5),
    supabase.auth.getUser(),
  ]);

  if (!landingPage) return notFound();

  // Found via real UAT: the only way back to the dashboard was a small
  // footer link a real owner testing their own page didn't notice at all
  // (see OwnerBar.tsx). Checked against growth_members for THIS specific
  // client, not just "is someone logged in" — a user can own more than one
  // growth_client, and a customer who happens to be logged in elsewhere
  // must never see another business's owner controls.
  let isOwner = false;
  if (authData.user) {
    const { data: membership } = await admin
      .from("growth_members")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("growth_client_id", client.id)
      .maybeSingle();
    isOwner = Boolean(membership);
  }

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
  const hasContent: Record<SectionKey, boolean> = {
    about: Boolean(landingPage.about_text),
    story: Boolean(client.additional_notes),
    services: Boolean(landingPage.services_text?.trim()),
    packages: packages.length > 0,
    trust: (testimonials?.length ?? 0) > 0,
    location: Boolean(client.business_address) && client.business_address !== "Online",
    howItWorks: true,
  };

  const template = getTemplate(client.template);

  // Every existing (and any future template-less) client keeps exactly the
  // original hand-built layout — nothing about this branch changed from
  // before templates existed, so there's zero risk to a client already live.
  if (!template) {
    let sectionCount = 0;
    const nextNumber = (present: boolean) => (present ? String(++sectionCount).padStart(2, "0") : "");
    const aboutNumber = nextNumber(hasContent.about);
    const storyNumber = nextNumber(hasContent.story);
    const servicesNumber = nextNumber(hasContent.services);
    const packagesNumber = nextNumber(hasContent.packages);
    const trustNumber = nextNumber(hasContent.trust);
    const locationNumber = nextNumber(hasContent.location);

    return (
      <main>
        {isOwner && <OwnerBar />}
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
            contactPhone={client.contact_phone}
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

  // Only the Left-Heavy Split hero needs a real photo — searched live by the
  // client's own industry, best-effort (see src/lib/images/pexels.ts).
  const photoUrl = template.hero === "split" ? await getIndustryPhoto(client.industry || client.business_name) : null;

  const checklistItems = ((landingPage.services_text as string | null) ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const heroProps = {
    businessName: client.business_name,
    logoUrl,
    headline: landingPage.headline,
    subheadline: landingPage.subheadline ?? "",
    ctaLabel: landingPage.cta_label,
    primaryColor,
    secondaryColor,
    facebookUrl: client.facebook_url,
    instagramUrl: client.instagram_url,
  };

  let sectionCount = 0;
  const nextNumber = (present: boolean) => (present ? String(++sectionCount).padStart(2, "0") : "");

  const renderSection = (key: SectionKey) => {
    const number = nextNumber(hasContent[key]);
    switch (key) {
      case "about":
        return (
          <AboutSection
            businessName={client.business_name}
            tagline={client.tagline}
            aboutText={landingPage.about_text}
            accentColor={accentColor}
            eyebrowNumber={number}
          />
        );
      case "story":
        return <StorySection storyText={client.additional_notes} accentColor={accentColor} eyebrowNumber={number} />;
      case "services":
        return (
          <ServicesList servicesText={landingPage.services_text} accentColor={accentColor} eyebrowNumber={number} />
        );
      case "packages":
        return (
          <PackagesSection
            packages={packages}
            ctaLabel={landingPage.cta_label}
            accentColor={accentColor}
            eyebrowNumber={number}
          />
        );
      case "trust":
        return <TrustBadges testimonials={testimonials ?? []} accentColor={accentColor} eyebrowNumber={number} />;
      case "location":
        return (
          <LocationMap businessAddress={client.business_address} accentColor={accentColor} eyebrowNumber={number} />
        );
      case "howItWorks":
        return <HowItWorksSection accentColor={accentColor} eyebrowNumber={number} />;
    }
  };

  return (
    <main>
      {isOwner && <OwnerBar />}
      <FbclidCapture />
      {template.hero === "minimal" && <MinimalHero {...heroProps} />}
      {template.hero === "split" && <SplitHero {...heroProps} photoUrl={photoUrl} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}
      {template.hero === "dark" && <DarkHero {...heroProps} />}
      {template.hero === "compact" && <CompactHero {...heroProps} testimonialCount={testimonials?.length ?? 0} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "checklist" && <ChecklistHero {...heroProps} checklistItems={checklistItems} />}
      {template.hero === "default" && (
        <ConversionHero {...heroProps} tagline={client.tagline} ctaHref={template.ctaHref} />
      )}

      {template.sections.map((key) => (
        <ScrollReveal key={key}>{renderSection(key)}</ScrollReveal>
      ))}

      <ScrollReveal>
        <LeadForm
          growthClientId={client.id}
          landingPageId={landingPage.id}
          pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/g/${clientSlug}`}
          primaryColor={primaryColor}
          contactEmail={client.contact_email}
          contactPhone={client.contact_phone}
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
