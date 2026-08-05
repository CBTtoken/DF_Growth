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
import { ReviewsSection, type PublicReview } from "@/components/reviews/ReviewsSection";
import { BookingSection, type PublicBookableUnit } from "@/components/landing/BookingSection";
import { ShopSection, type PublicShopProduct } from "@/components/landing/ShopSection";
import { MinimalHero } from "@/components/landing/heroes/MinimalHero";
import { SplitHero } from "@/components/landing/heroes/SplitHero";
import { EditorialHero } from "@/components/landing/heroes/EditorialHero";
import { DarkHero } from "@/components/landing/heroes/DarkHero";
import { CompactHero } from "@/components/landing/heroes/CompactHero";
import { GeometricHero } from "@/components/landing/heroes/GeometricHero";
import { ChecklistHero } from "@/components/landing/heroes/ChecklistHero";
import { BentoHero } from "@/components/landing/heroes/BentoHero";
import { TimelineHero } from "@/components/landing/heroes/TimelineHero";
import { ShowcaseHero } from "@/components/landing/heroes/ShowcaseHero";
import { DuoHero } from "@/components/landing/heroes/DuoHero";
import { JobCardHero } from "@/components/landing/heroes/JobCardHero";
import { PipelineHero } from "@/components/landing/heroes/PipelineHero";
import { ShowreelHero } from "@/components/landing/heroes/ShowreelHero";
import { ensureContrast } from "@/lib/color";
import { getTemplate, type SectionKey } from "@/lib/templates/registry";
import { getAnchor, HEADING_FONT_VARIABLE } from "@/lib/templates/anchors";

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
  city: string | null;
  meta_pixel_id: string | null;
  hero_photo_id: string | null;
  // Optional: marketplace/sample preview call sites don't fetch this, and a
  // client without Booking switched on simply never has it true.
  booking_enabled?: boolean;
  shop_enabled?: boolean;
  shop_flat_delivery_cents?: number | null;
  shop_free_delivery_over_cents?: number | null;
  // Quick Sprint: Payments/Geo Sec 2 — fetched once at onboarding time
  // (src/app/onboard/actions.ts, src/lib/whatsapp/conversation.ts), never
  // live here. Optional/nullable for the same reason booking_enabled is:
  // sample/preview call sites and pre-existing clients from before this
  // column existed may not have a value.
  fallback_photo_url?: string | null;
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
  bookableUnits = [],
  bookingRules = null,
  shopProducts = [],
  reviews = [],
  clientSlug,
  mode,
  templateOverride,
}: {
  client: ClientData;
  landingPage: LandingPageData;
  testimonials: Testimonial[];
  photos: Photo[];
  bookableUnits?: PublicBookableUnit[];
  bookingRules?: { operating_hours: Record<string, { open: string; close: string }[]>; buffer_minutes: number } | null;
  shopProducts?: PublicShopProduct[];
  // Defaults to [] for /dashboard/preview, which doesn't fetch real reviews
  // (a template preview, not the live page — accurate review content isn't
  // the point there). The real public route always passes the client's
  // actual published reviews.
  reviews?: PublicReview[];
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
    (client.packages as { name: string; price: string; description: string; type?: "package" | "special" | "discount" | "event" }[] | null) ?? [];

  const logoUrl = client.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${client.logo_path}`
    : null;

  // Rate & Review Sprint 2, Sec 7: the SEO structured-data aggregate,
  // derived from the already-fetched `reviews` prop rather than its own
  // query — performance pass 2026-07-18, see ReviewsSection.tsx for why.
  const reviewCount = reviews.length;
  const aggregateRating =
    reviewCount > 0
      ? {
          ratingValue: reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount,
          reviewCount,
        }
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
    // Always present — ReviewsSection itself never returns null (Sec 5:
    // the section is the call-to-action to leave the first review when
    // there are none yet), so it always gets a real number, matching every
    // other section whose hasContent mirrors whether it actually renders.
    reviews: true,
  };

  const template = getTemplate(templateOverride !== undefined ? templateOverride : client.template);

  const trackingScripts = mode === "live" && (
    <>
      <OwnerBarGate growthClientId={client.id} />
      <FbclidCapture />
      <PixelConsentGate pixelId={client.meta_pixel_id} />
    </>
  );

  // docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.5: rendered
  // unconditionally, like EarlyContactCta/ReviewsSection, rather than as a
  // per-template SectionKey — every client with Booking switched on should
  // see it regardless of which of the 10 templates they picked, and
  // BookingSection itself already returns null when there are no active
  // bookable units, so this is safe to place unconditionally too.
  const bookingSection = client.booking_enabled && bookableUnits.length > 0 && (
    <ScrollReveal>
      <BookingSection
        growthClientId={client.id}
        ownerEmail={client.contact_email}
        businessName={client.business_name}
        primaryColor={primaryColor}
        units={bookableUnits}
        operatingHours={bookingRules?.operating_hours ?? {}}
        bufferMinutes={bookingRules?.buffer_minutes ?? 0}
      />
    </ScrollReveal>
  );

  // Handoff Sec 1.1: the landing page carries a short featured row and a
  // link, and the shop itself lives at its own URL. What used to be here was
  // the entire shop, cart and checkout included, on a page whose job is to
  // introduce the business.
  const hasShop = Boolean(client.shop_enabled) && shopProducts.length > 0;
  const shopSection = hasShop && (
    <ScrollReveal>
      <ShopSection clientSlug={clientSlug} primaryColor={primaryColor} products={shopProducts} />
    </ScrollReveal>
  );

  const previewBanner = mode === "preview" && (
    <div className="sticky top-0 z-50 bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white">
      Previewing your page. Visitors never see this banner
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
      industry={client.industry}
      city={client.city}
      aggregateRating={aggregateRating}
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
    const reviewsNumber = nextNumber(hasContent.reviews);

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
          shopHref={hasShop ? `/${clientSlug}/shop` : undefined}
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
          <ReviewsSection businessId={client.id} reviews={reviews} accentColor={accentColor} eyebrowNumber={reviewsNumber} />
        </ScrollReveal>
        {bookingSection}
        {shopSection}
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
  // Whether the hero photo is the member's own upload rather than a library/
  // fallback ambient image — the trade heroes' credibility captions ("A real
  // job, our photo" / "On the job") render only when this is true.
  let photoIsOwn = false;
  if (template.hero === "split" || template.hero === "dark" || template.hero === "duo" || template.hero === "jobcard" || template.hero === "pipeline" || template.hero === "showreel") {
    // Combined spec Sec 7: uploading a gallery photo must not silently make
    // it the hero background — only an explicit hero_photo_id selection
    // does that. No selection falls back to the client's stored fallback
    // photo — Quick Sprint: Payments/Geo Sec 2, fetched once at onboarding
    // time (or whenever industry is saved) and stored on the client record,
    // never called live here anymore. A pre-existing client from before
    // that column existed simply has `fallback_photo_url: null` until they
    // touch their profile again — same graceful "no showcase image" fallback
    // this section always had on a Pexels failure.
    const heroPhoto = client.hero_photo_id ? photos.find((p) => p.id === client.hero_photo_id) : undefined;
    photoUrl = heroPhoto ? `${photosStorageBase}/${heroPhoto.storage_path}` : (client.fallback_photo_url ?? null);
    photoIsOwn = Boolean(heroPhoto);
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
    // Undefined rather than a link when there is nothing to sell, so a
    // business with no products never grows a menu item leading to an
    // empty shop. Handoff Sec 1.1.
    shopHref: hasShop ? `/${clientSlug}/shop` : undefined,
  };

  let sectionCount = 0;
  const nextNumber = (present: boolean) => (present ? String(++sectionCount).padStart(2, "0") : "");

  const anchor = getAnchor(template.id);
  // Dark Mode pilot rebuild: accentColor was only ever contrast-checked
  // against white, even for a dark-surface anchor — a client color that
  // clears 4.5:1 against white can be nearly invisible against near-black.
  // Every other anchor is "light-default", so this is a no-op for them.
  const anchorAccentColor = ensureContrast(primaryColor, anchor.sectionSurface === "dark" ? "#0b1220" : "#ffffff");

  // The "statement" about layout shows a work photo beside the pitch. First
  // gallery photo that isn't already the hero, so the top of the page never
  // repeats itself; falls back to the industry photo, then to text-only.
  const aboutPhoto =
    anchor.aboutLayout === "statement"
      ? photos.find((p) => p.id !== client.hero_photo_id)
      : undefined;
  const aboutPhotoUrl = aboutPhoto
    ? `${photosStorageBase}/${aboutPhoto.storage_path}`
    : anchor.aboutLayout === "statement"
      ? (client.fallback_photo_url ?? null)
      : null;

  const renderSection = (key: SectionKey) => {
    const number = nextNumber(hasContent[key]);
    switch (key) {
      case "about":
        return (
          <AboutSection
            businessName={client.business_name}
            tagline={client.tagline}
            aboutText={landingPage.about_text}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
            photoUrl={aboutPhotoUrl}
          />
        );
      case "story":
        return (
          <StorySection
            storyText={client.additional_notes}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
      case "services":
        return (
          <ServicesList
            servicesText={landingPage.services_text}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
      case "packages":
        return (
          <PackagesSection packages={packages} accentColor={anchorAccentColor} eyebrowNumber={number} anchor={anchor} />
        );
      case "trust":
        return (
          <TrustBadges
            testimonials={testimonials}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
      case "gallery":
        return (
          <PhotoGallerySection
            photos={photos}
            storageBase={photosStorageBase}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
      case "location":
        return (
          <LocationMap
            businessAddress={client.business_address}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
      case "howItWorks":
        return <HowItWorksSection accentColor={anchorAccentColor} eyebrowNumber={number} anchor={anchor} />;
      case "reviews":
        return (
          <ReviewsSection
            businessId={client.id}
            reviews={reviews}
            accentColor={anchorAccentColor}
            eyebrowNumber={number}
            anchor={anchor}
          />
        );
    }
  };

  return (
    <main className={HEADING_FONT_VARIABLE[anchor.headingFont]}>
      {previewBanner}
      {trackingScripts}
      {schema}
      {template.hero === "minimal" && <MinimalHero {...heroProps} />}
      {template.hero === "split" && <SplitHero {...heroProps} photoUrl={photoUrl} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}
      {template.hero === "dark" && <DarkHero {...heroProps} photoUrl={photoUrl} />}
      {template.hero === "compact" && <CompactHero {...heroProps} testimonialCount={testimonials.length} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "checklist" && <ChecklistHero {...heroProps} checklistItems={checklistItems} />}
      {template.hero === "bento" && <BentoHero {...heroProps} highlights={checklistItems} ctaHref={template.ctaHref} />}
      {template.hero === "timeline" && <TimelineHero {...heroProps} steps={checklistItems} ctaHref={template.ctaHref} />}
      {template.hero === "duo" && (
        <DuoHero
          {...heroProps}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone || client.call_phone}
          photoUrl={photoUrl}
          // The two doors read best when each says what is actually behind
          // it, so the shop line names the range rather than saying "shop".
          shopBlurb={
            shopProducts.length > 0
              ? `Browse ${shopProducts.length} product${shopProducts.length === 1 ? "" : "s"} and order online.`
              : undefined
          }
        />
      )}
      {template.hero === "jobcard" && (
        <JobCardHero
          {...heroProps}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone || client.call_phone}
          contactEmail={client.contact_email}
          city={client.city}
          photoUrl={photoUrl}
          photoIsOwn={photoIsOwn}
        />
      )}
      {template.hero === "pipeline" && (
        <PipelineHero
          {...heroProps}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone || client.call_phone}
          contactEmail={client.contact_email}
          city={client.city}
          photoUrl={photoUrl}
          photoIsOwn={photoIsOwn}
        />
      )}
      {template.hero === "showreel" && (
        <ShowreelHero
          {...heroProps}
          callPhone={client.call_phone}
          whatsappPhone={client.whatsapp_phone || client.call_phone}
          contactEmail={client.contact_email}
          // Plain words for the hero strip: the address field carries the
          // service area for a travelling business, the city stands in
          // when only that exists. "Online" is the wizard's no-premises
          // sentinel and is not an area a bar can drive to.
          areasServed={
            client.business_address && client.business_address !== "Online"
              ? client.business_address
              : client.city
          }
          // The showreel pair: the chosen hero photo leads, the next
          // gallery photo tucks behind it, never the same photo twice.
          // Own uploads only, never fallback_photo_url: this hero's alt
          // text presents the picture as the member's own event, so an
          // ambient library image may not stand in (house rule: ambient
          // imagery never poses as their work). No photos, no collage.
          photoUrls={(() => {
            const heroFirst = [
              ...photos.filter((p) => p.id === client.hero_photo_id),
              ...photos.filter((p) => p.id !== client.hero_photo_id),
            ];
            return heroFirst.slice(0, 2).map((p) => `${photosStorageBase}/${p.storage_path}`);
          })()}
        />
      )}
      {template.hero === "showcase" && (
        <ShowcaseHero
          {...heroProps}
          packages={packages.map((p) => ({ name: p.name, price: p.price }))}
          ctaHref={template.ctaHref}
        />
      )}
      {template.hero === "default" && (
        <ConversionHero {...heroProps} tagline={client.tagline} ctaHref={template.ctaHref} />
      )}
      {/* Combined spec Sec 19: templates don't share a fixed section order
          (About isn't always first), so this goes right after the hero
          instead — the other position the spec allows for. */}
      {packages.length === 0 && (
        <EarlyContactCta accentColor={anchorAccentColor} dark={anchor.sectionSurface === "dark"} />
      )}

      {template.sections.map((key) => (
        <ScrollReveal key={key}>{renderSection(key)}</ScrollReveal>
      ))}

      {bookingSection}
      {shopSection}
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
