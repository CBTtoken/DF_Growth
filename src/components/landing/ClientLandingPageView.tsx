import Link from "next/link";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { LocalBusinessSchema } from "@/components/landing/LocalBusinessSchema";
import { ConversionHero } from "@/components/landing/ConversionHero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { LeadForm } from "@/components/landing/LeadForm";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesList } from "@/components/landing/ServicesList";
import { LocationMap } from "@/components/landing/LocationMap";
import { PackagesSection } from "@/components/landing/PackagesSection";
import { PhotoGallerySection } from "@/components/landing/PhotoGallerySection";
import { StorySection } from "@/components/landing/StorySection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { EarlyContactCta } from "@/components/landing/EarlyContactCta";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
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

type ClientData = {
  id: string;
  business_name: string;
  contact_email: string | null;
  call_phone: string | null;
  whatsapp_phone: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  tagline: string | null;
  business_address: string | null;
  packages: unknown;
  logo_path: string | null;
  additional_notes: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  template: string | null;
  industry: string | null;
  meta_pixel_id: string | null;
  hero_photo_id: string | null;
};

type LandingPageData = {
  id: string;
  headline: string;
  subheadline: string | null;
  about_text: string | null;
  services_text: string | null;
  cta_label: string;
};

type Testimonial = { id: string; author_name: string; quote: string; rating: number | null };
type Photo = { id: string; storage_path: string };

// Combined spec Sec 6: shared between the real public page (/[clientSlug])
// and the authenticated preview route (/dashboard/preview) so there is one
// rendering path, not two copies that can silently drift apart. Extracted
// unchanged from what was previously the whole of /[clientSlug]/page.tsx —
// same hero/section/eyebrow-numbering logic either way, mode only controls
// whether owner/tracking-only pieces render.
export async function ClientLandingPageView({
  client,
  landingPage,
  testimonials,
  photos,
  clientSlug,
  mode,
  templateOverride,
}: {
  client: ClientData;
  landingPage: LandingPageData;
  testimonials: Testimonial[];
  photos: Photo[];
  clientSlug: string;
  mode: "live" | "preview";
  // Sec 6 / Sec 9: lets the template picker preview "what would my own page
  // look like in template X" without actually saving that choice first.
  templateOverride?: string | null;
}) {
  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

  // Defensive fallback only — the wizard requires a color before a client
  // can publish, so this shouldn't normally be hit.
  const primaryColor = client.brand_primary_color ?? "#1081b8";
  const secondaryColor = client.brand_secondary_color ?? "#ffffff";
  const accentColor = ensureContrast(primaryColor, "#ffffff");

  const packages =
    (client.packages as { name: string; price: string; description: string; type?: "package" | "special" | "discount" }[] | null) ?? [];

  const logoUrl = client.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${client.logo_path}`
    : null;

  const hasContent: Record<SectionKey, boolean> = {
    about: Boolean(landingPage.about_text),
    story: Boolean(client.additional_notes),
    services: Boolean(landingPage.services_text?.trim()),
    packages: packages.length > 0,
    trust: testimonials.length > 0,
    gallery: photos.length >= 2,
    location: Boolean(client.business_address) && client.business_address !== "Online",
    howItWorks: true,
  };

  const template = getTemplate(templateOverride !== undefined ? templateOverride : client.template);

  const trackingScripts = mode === "live" && (
    <>
      <OwnerBarGate growthClientId={client.id} />
      <FbclidCapture />
      <PixelConsentGate pixelId={client.meta_pixel_id} />
    </>
  );

  const previewBanner = mode === "preview" && (
    <div className="sticky top-0 z-50 bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white">
      Previewing your page — visitors never see this banner
    </div>
  );

  const footer = (
    <footer className="bg-white py-6 text-center text-xs text-gray-400">
      © {new Date().getFullYear()} {client.business_name} ·{" "}
      <Link href="/dashboard" className="underline-offset-2 hover:text-gray-600 hover:underline">
        Manage this page
      </Link>{" "}
      ·{" "}
      <Link href="/privacy" className="underline-offset-2 hover:text-gray-600 hover:underline">
        Privacy Policy
      </Link>{" "}
      ·{" "}
      <Link href="/terms" className="underline-offset-2 hover:text-gray-600 hover:underline">
        Terms &amp; Conditions
      </Link>
    </footer>
  );

  const schema = (
    <LocalBusinessSchema
      businessName={client.business_name}
      description={landingPage.about_text ?? client.tagline}
      url={`${process.env.NEXT_PUBLIC_SITE_URL}/${clientSlug}`}
      logoUrl={logoUrl}
      telephone={client.call_phone}
      email={client.contact_email}
      address={client.business_address}
    />
  );

  // Every template-less client keeps exactly the original hand-built layout.
  if (!template) {
    let sectionCount = 0;
    const nextNumber = (present: boolean) => (present ? String(++sectionCount).padStart(2, "0") : "");
    const aboutNumber = nextNumber(hasContent.about);
    const storyNumber = nextNumber(hasContent.story);
    const servicesNumber = nextNumber(hasContent.services);
    const packagesNumber = nextNumber(hasContent.packages);
    const trustNumber = nextNumber(hasContent.trust);
    const galleryNumber = nextNumber(hasContent.gallery);
    const locationNumber = nextNumber(hasContent.location);

    return (
      <main>
        {previewBanner}
        {trackingScripts}
        {schema}
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
          websiteUrl={client.website_url}
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
        {packages.length === 0 && <EarlyContactCta accentColor={accentColor} />}
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
          <PackagesSection packages={packages} accentColor={accentColor} eyebrowNumber={packagesNumber} />
        </ScrollReveal>
        <ScrollReveal>
          <TrustBadges testimonials={testimonials} accentColor={accentColor} eyebrowNumber={trustNumber} />
        </ScrollReveal>
        <ScrollReveal>
          <PhotoGallerySection
            photos={photos}
            storageBase={photosStorageBase}
            accentColor={accentColor}
            eyebrowNumber={galleryNumber}
          />
        </ScrollReveal>
        <ScrollReveal>
          <LocationMap
            businessAddress={client.business_address}
            accentColor={accentColor}
            eyebrowNumber={locationNumber}
          />
        </ScrollReveal>
        <ScrollReveal>
          <ReviewsSection businessId={client.id} accentColor={accentColor} />
        </ScrollReveal>
        <ScrollReveal>
          <LeadForm
            growthClientId={client.id}
            landingPageId={landingPage.id}
            pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/${clientSlug}`}
            primaryColor={primaryColor}
            contactEmail={client.contact_email}
            callPhone={client.call_phone}
            whatsappPhone={client.whatsapp_phone}
            websiteUrl={client.website_url}
            businessName={client.business_name}
          />
        </ScrollReveal>
        {footer}
      </main>
    );
  }

  let photoUrl: string | null = null;
  if (template.hero === "split") {
    // Combined spec Sec 7: uploading a gallery photo must not silently make
    // it the hero background — only an explicit hero_photo_id selection
    // does that. No selection falls back to the same Pexels stock photo
    // used when there are zero gallery photos at all, never "whichever
    // photo happened to be uploaded first."
    const heroPhoto = client.hero_photo_id ? photos.find((p) => p.id === client.hero_photo_id) : undefined;
    photoUrl = heroPhoto
      ? `${photosStorageBase}/${heroPhoto.storage_path}`
      : await getIndustryPhoto(client.industry || client.business_name);
  }

  const checklistItems = (landingPage.services_text ?? "")
    .split("\n")
    .map((line) => line.trim())
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
    websiteUrl: client.website_url,
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
          <PackagesSection packages={packages} accentColor={accentColor} eyebrowNumber={number} />
        );
      case "trust":
        return <TrustBadges testimonials={testimonials} accentColor={accentColor} eyebrowNumber={number} />;
      case "gallery":
        return (
          <PhotoGallerySection
            photos={photos}
            storageBase={photosStorageBase}
            accentColor={accentColor}
            eyebrowNumber={number}
          />
        );
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
      {previewBanner}
      {trackingScripts}
      {schema}
      {template.hero === "minimal" && <MinimalHero {...heroProps} />}
      {template.hero === "split" && <SplitHero {...heroProps} photoUrl={photoUrl} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}
      {template.hero === "dark" && <DarkHero {...heroProps} />}
      {template.hero === "compact" && <CompactHero {...heroProps} testimonialCount={testimonials.length} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "checklist" && <ChecklistHero {...heroProps} checklistItems={checklistItems} />}
      {template.hero === "default" && (
        <ConversionHero {...heroProps} tagline={client.tagline} ctaHref={template.ctaHref} />
      )}
      {/* Combined spec Sec 19: templates don't share a fixed section order
          (About isn't always first), so this goes right after the hero
          instead — the other position the spec allows for. */}
      {packages.length === 0 && <EarlyContactCta accentColor={accentColor} />}

      {template.sections.map((key) => (
        <ScrollReveal key={key}>{renderSection(key)}</ScrollReveal>
      ))}

      <ScrollReveal>
        <ReviewsSection businessId={client.id} accentColor={accentColor} />
      </ScrollReveal>

      <ScrollReveal>
        <LeadForm
          growthClientId={client.id}
          landingPageId={landingPage.id}
          pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/${clientSlug}`}
          primaryColor={primaryColor}
          contactEmail={client.contact_email}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone}
          websiteUrl={client.website_url}
          businessName={client.business_name}
        />
      </ScrollReveal>
      {footer}
    </main>
  );
}
