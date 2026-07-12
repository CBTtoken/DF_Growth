import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesList } from "@/components/landing/ServicesList";
import { LocationMap } from "@/components/landing/LocationMap";
import { PackagesSection } from "@/components/landing/PackagesSection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { StorySection } from "@/components/landing/StorySection";
import { PreviewLeadForm } from "@/components/landing/PreviewLeadForm";
import { DarkHero } from "@/components/landing/heroes/DarkHero";
import { GeometricHero } from "@/components/landing/heroes/GeometricHero";
import { EditorialHero } from "@/components/landing/heroes/EditorialHero";
import { ensureContrast } from "@/lib/color";
import { getTemplate, type SectionKey } from "@/lib/templates/registry";
import { SHOWCASE_SAMPLES } from "@/lib/templates/sample-showcase";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const sample = SHOWCASE_SAMPLES[slug];
  return {
    title: sample ? `${sample.businessName} — Sample Page | DigitalFlyer SA` : "Sample Page",
    // Combined spec Sec 36: a fictional business, not a real listing —
    // never indexed, so it can't show up in search results looking like a
    // real business.
    robots: { index: false, follow: true },
  };
}

// Combined spec Sec 36: "See It In Action" needs pages that feel like real
// businesses, not the shared template-picker business (sample-data.ts,
// deliberately the same content across all 10 templates so a client can
// fairly compare layouts). Growth has no real, permission-granted client
// pages yet, nothing has launched, so these are honestly-labeled fictional
// businesses instead (see sample-showcase.ts's own comment on why that's a
// different, non-deceptive thing from fabricated customer proof). No
// tracking, no real lead capture (PreviewLeadForm, same non-interactive
// stand-in the template picker's own previews use) — nothing here should
// behave as if it were a live client's page.
export default async function SamplePage({ params }: { params: Params }) {
  const { slug } = await params;
  const sample = SHOWCASE_SAMPLES[slug];
  if (!sample) return notFound();

  const template = getTemplate(sample.templateId);
  if (!template) return notFound();

  const accentColor = ensureContrast(sample.primaryColor, "#ffffff");

  const heroProps = {
    businessName: sample.businessName,
    logoUrl: null,
    headline: sample.headline,
    subheadline: sample.subheadline,
    ctaLabel: sample.ctaLabel,
    primaryColor: sample.primaryColor,
    secondaryColor: sample.secondaryColor,
  };

  // Matches ClientLandingPageView's own pattern: a section that renders
  // nothing (gallery has no fixture photos, howItWorks isn't used by any
  // of these three templates) must not still consume a number, or the
  // eyebrow numbering skips one (e.g. 05 straight to 07).
  const RENDERED_SECTIONS: SectionKey[] = ["about", "story", "services", "packages", "trust", "location"];
  let sectionCount = 0;
  const nextNumber = (key: SectionKey) =>
    RENDERED_SECTIONS.includes(key) ? String(++sectionCount).padStart(2, "0") : "";

  const renderSection = (key: SectionKey) => {
    const number = nextNumber(key);
    switch (key) {
      case "about":
        return (
          <AboutSection
            businessName={sample.businessName}
            tagline={sample.tagline}
            aboutText={sample.aboutText}
            accentColor={accentColor}
            eyebrowNumber={number}
          />
        );
      case "story":
        return <StorySection storyText={sample.additionalNotes} accentColor={accentColor} eyebrowNumber={number} />;
      case "services":
        return <ServicesList servicesText={sample.servicesText} accentColor={accentColor} eyebrowNumber={number} />;
      case "packages":
        return <PackagesSection packages={sample.packages} accentColor={accentColor} eyebrowNumber={number} />;
      case "trust":
        return <TrustBadges testimonials={sample.testimonials} accentColor={accentColor} eyebrowNumber={number} />;
      case "location":
        return (
          <LocationMap businessAddress={sample.businessAddress} accentColor={accentColor} eyebrowNumber={number} />
        );
      // "gallery" has no fixture photos here (same as a real client who
      // hasn't uploaded any — PhotoGallerySection already renders nothing
      // in that case), and "howItWorks" isn't used by any of the three
      // templates these fixtures are assigned to.
      default:
        return null;
    }
  };

  return (
    <main>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white">
        <span>
          Sample page: {sample.businessName} isn&apos;t a real DigitalFlyer SA client. This shows what the
          platform can build.
        </span>
        <Link href="/pricing" className="underline underline-offset-2 hover:no-underline">
          See pricing
        </Link>
      </div>

      {template.hero === "dark" && <DarkHero {...heroProps} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}

      {template.sections.map((key) => (
        <div key={key}>{renderSection(key)}</div>
      ))}

      <PreviewLeadForm primaryColor={sample.primaryColor} />
    </main>
  );
}
