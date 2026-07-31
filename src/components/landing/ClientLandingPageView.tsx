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
import { ensureContrast } from "@/lib/color";
import { resolveLocation, servicesHeading } from "@/lib/landing/page-copy";
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
  // Handoff 01 C: needed to build a map query that actually resolves.
  // Optional because the sample/preview call sites do not fetch it.
  province?: string | null;
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
    (client.packages as { name: string; price: string; description: string; type?: "package" | "special" | "discount" }[] | null) ?? [];

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

  // Handoff 01 D, the one rule the whole page now obeys: "a section with no
  // content does not render, and a call to action that targets a section that
  // did not render does not render either."
  //
  // This map used to exist only to drive eyebrow numbering, and two of its
  // entries lied about what actually rendered (reviews claimed content it did
  // not have; location claimed an address it could not place). It is now the
  // single source of truth for what appears on the page, and every hero link
  // that targets a section is gated on it.
  const serviceLines = (landingPage.services_text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasContent: Record<SectionKey, boolean> = {
    about: Boolean(landingPage.about_text),
    story: Boolean(client.additional_notes),
    services: serviceLines.length > 0,
    packages: packages.length > 0,
    trust: testimonials.length > 0,
    gallery: photos.length >= 2,
    // Matches LocationMap's own decision exactly, rather than approximating
    // it: an address it cannot confidently place renders as an area line, and
    // no address at all renders nothing.
    location: resolveLocation({
      businessAddress: client.business_address,
      city: client.city,
      province: client.province,
    }).kind !== "none",
    howItWorks: true,
    reviews: reviews.length > 0,
  };

  // Handoff 01 F: replaces "Everything you need, in one place.", which was
  // above the services list of every page this platform has ever generated.
  const servicesSectionHeading = servicesHeading({ industry: client.industry });

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

  const shopSection = client.shop_enabled && shopProducts.length > 0 && (
    <ScrollReveal>
      <ShopSection
        growthClientId={client.id}
        ownerEmail={client.contact_email}
        businessName={client.business_name}
        primaryColor={primaryColor}
        products={shopProducts}
        flatDeliveryCents={client.shop_flat_delivery_cents ?? 0}
        freeDeliveryOverCents={client.shop_free_delivery_over_cents ?? null}
      />
    </ScrollReveal>
  );

  const previewBanner = mode === "preview" && (
    <div className="sticky top-0 z-50 bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white">
      Previewing your page. Visitors never see this banner
    </div>
  );

  // Handoff 01 E: the DigitalFlyer logo used to sit in a strip above the
  // member's own hero, linking to our pricing page, so the member's page
  // marketed us above them. The member's name and logo is now the topmost
  // brand element and our attribution is one line down here, pointing at the
  // marketplace (where a visitor might find another business) rather than at
  // pricing (which is for people who want to buy a page, not for this
  // business's customers). "Manage this page" is the member's own link and
  // stays.
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
      <span className="mt-2 block">
        Page by{" "}
        <Link href="/marketplace" className="underline-offset-2 hover:text-gray-600 hover:underline">
          DigitalFlyer
        </Link>
      </span>
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
  //
  // Handoff 01 F: the "01 ·", "02 ·" section eyebrows that used to be
  // calculated here are gone. They were a template tell in the most literal
  // sense: no small business numbers the sections of its own website, and
  // every page carrying them read as output from the same machine.
  if (!template) {
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
        {hasContent.about && (
          <ScrollReveal>
            <AboutSection
              businessName={client.business_name}
              aboutText={landingPage.about_text}
              accentColor={accentColor}
            />
          </ScrollReveal>
        )}
        {packages.length === 0 && <EarlyContactCta accentColor={accentColor} />}
        {hasContent.story && (
          <ScrollReveal>
            <StorySection storyText={client.additional_notes} accentColor={accentColor} />
          </ScrollReveal>
        )}
        {hasContent.services && (
          <ScrollReveal>
            <ServicesList
              servicesText={landingPage.services_text}
              heading={servicesSectionHeading}
              accentColor={accentColor}
            />
          </ScrollReveal>
        )}
        {hasContent.packages && (
          <ScrollReveal>
            <PackagesSection packages={packages} accentColor={accentColor} />
          </ScrollReveal>
        )}
        {hasContent.trust && (
          <ScrollReveal>
            <TrustBadges testimonials={testimonials} accentColor={accentColor} />
          </ScrollReveal>
        )}
        {hasContent.gallery && (
          <ScrollReveal>
            <PhotoGallerySection photos={photos} storageBase={photosStorageBase} accentColor={accentColor} />
          </ScrollReveal>
        )}
        {hasContent.location && (
          <ScrollReveal>
            <LocationMap
              businessAddress={client.business_address}
              city={client.city}
              province={client.province}
              accentColor={accentColor}
            />
          </ScrollReveal>
        )}
        {hasContent.reviews && (
          <ScrollReveal>
            <ReviewsSection businessId={client.id} reviews={reviews} accentColor={accentColor} />
          </ScrollReveal>
        )}
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
  if (template.hero === "split" || template.hero === "dark") {
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
  }

  // Handoff 01 B: /seven-passes-initiative rendered its complete service list
  // twice, once inside the hero's browser frame and again under the services
  // section. ChecklistHero is the only hero that shows the list in full, so
  // that template's standalone services section is dropped below and the hero
  // gets every service rather than a silently truncated first six. BentoHero
  // (4 tiles) and TimelineHero (3 steps) show a strict subset and link onward
  // to the full section, which is a preview rather than a duplicate, so they
  // are left alone and cap themselves.
  const heroOwnsServiceList = template.hero === "checklist";

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

  const anchor = getAnchor(template.id);
  // Dark Mode pilot rebuild: accentColor was only ever contrast-checked
  // against white, even for a dark-surface anchor — a client color that
  // clears 4.5:1 against white can be nearly invisible against near-black.
  // Every other anchor is "light-default", so this is a no-op for them.
  const anchorAccentColor = ensureContrast(primaryColor, anchor.sectionSurface === "dark" ? "#0b1220" : "#ffffff");

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "about":
        return (
          <AboutSection
            businessName={client.business_name}
            aboutText={landingPage.about_text}
            accentColor={anchorAccentColor}
            anchor={anchor}
          />
        );
      case "story":
        return <StorySection storyText={client.additional_notes} accentColor={anchorAccentColor} anchor={anchor} />;
      case "services":
        return (
          <ServicesList
            servicesText={landingPage.services_text}
            heading={servicesSectionHeading}
            accentColor={anchorAccentColor}
            anchor={anchor}
          />
        );
      case "packages":
        return <PackagesSection packages={packages} accentColor={anchorAccentColor} anchor={anchor} />;
      case "trust":
        return <TrustBadges testimonials={testimonials} accentColor={anchorAccentColor} anchor={anchor} />;
      case "gallery":
        return (
          <PhotoGallerySection
            photos={photos}
            storageBase={photosStorageBase}
            accentColor={anchorAccentColor}
            anchor={anchor}
          />
        );
      case "location":
        return (
          <LocationMap
            businessAddress={client.business_address}
            city={client.city}
            province={client.province}
            accentColor={anchorAccentColor}
            anchor={anchor}
          />
        );
      case "howItWorks":
        return <HowItWorksSection accentColor={anchorAccentColor} anchor={anchor} />;
      case "reviews":
        return (
          <ReviewsSection businessId={client.id} reviews={reviews} accentColor={anchorAccentColor} anchor={anchor} />
        );
    }
  };

  // Handoff 01 D, applied once for the whole page: a section with no content
  // is not in this list, so it cannot render and nothing can link to it.
  const visibleSections = template.sections.filter(
    (key) => hasContent[key] && !(key === "services" && heroOwnsServiceList)
  );

  // Handoff 01 D: the multi-product template's hero CTA points at #packages.
  // A member with no packages has no packages section, so the button that
  // opens their page led nowhere. It falls back to the form, which is always
  // there.
  const heroCtaHref = template.ctaHref === "#packages" && !hasContent.packages ? "#lead-form" : template.ctaHref;

  return (
    <main className={HEADING_FONT_VARIABLE[anchor.headingFont]}>
      {previewBanner}
      {trackingScripts}
      {schema}
      {template.hero === "minimal" && <MinimalHero {...heroProps} />}
      {template.hero === "split" && <SplitHero {...heroProps} photoUrl={photoUrl} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}
      {template.hero === "dark" && (
        <DarkHero {...heroProps} photoUrl={photoUrl} showTestimonialsLink={hasContent.trust} />
      )}
      {template.hero === "compact" && <CompactHero {...heroProps} testimonialCount={testimonials.length} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "checklist" && <ChecklistHero {...heroProps} checklistItems={serviceLines} />}
      {template.hero === "bento" && <BentoHero {...heroProps} highlights={serviceLines} ctaHref={heroCtaHref} />}
      {template.hero === "timeline" && <TimelineHero {...heroProps} steps={serviceLines} ctaHref={heroCtaHref} />}
      {template.hero === "showcase" && (
        <ShowcaseHero
          {...heroProps}
          packages={packages.map((p) => ({ name: p.name, price: p.price }))}
          ctaHref={heroCtaHref}
        />
      )}
      {template.hero === "default" && (
        <ConversionHero {...heroProps} tagline={client.tagline} ctaHref={heroCtaHref} />
      )}
      {/* Combined spec Sec 19: templates don't share a fixed section order
          (About isn't always first), so this goes right after the hero
          instead — the other position the spec allows for. */}
      {packages.length === 0 && (
        <EarlyContactCta accentColor={anchorAccentColor} dark={anchor.sectionSurface === "dark"} />
      )}

      {visibleSections.map((key) => (
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
