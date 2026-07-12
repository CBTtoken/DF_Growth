import { notFound } from "next/navigation";
import { ConversionHero } from "@/components/landing/ConversionHero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { PreviewLeadForm } from "@/components/landing/PreviewLeadForm";
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
import { SAMPLE_DATA } from "@/lib/templates/sample-data";

// Real, live-rendered previews for the template picker (onboarding step 4
// and the dashboard's "Change template") — embedded at small scale via
// iframe rather than generated as static screenshots, so a preview can
// never drift out of sync with what the template actually looks like.
// Sample data only, never a real client's data; PreviewLeadForm stands in
// for the real lead-capture form since there's no real growthClientId to
// bind a submission to here.
export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  const primaryColor = SAMPLE_DATA.primaryColor;
  const secondaryColor = SAMPLE_DATA.secondaryColor;
  const accentColor = ensureContrast(primaryColor, "#ffffff");
  const testimonials = SAMPLE_DATA.testimonials;
  const packages = SAMPLE_DATA.packages;

  if (templateId === "conversion") {
    let n = 0;
    const num = () => String(++n).padStart(2, "0");
    return (
      <main>
        <ConversionHero
          businessName={SAMPLE_DATA.businessName}
          tagline={SAMPLE_DATA.tagline}
          logoUrl={null}
          headline={SAMPLE_DATA.headline}
          subheadline={SAMPLE_DATA.subheadline}
          ctaLabel={SAMPLE_DATA.ctaLabel}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
        <AboutSection
          businessName={SAMPLE_DATA.businessName}
          tagline={SAMPLE_DATA.tagline}
          aboutText={SAMPLE_DATA.aboutText}
          accentColor={accentColor}
          eyebrowNumber={num()}
        />
        <StorySection storyText={SAMPLE_DATA.additionalNotes} accentColor={accentColor} eyebrowNumber={num()} />
        <ServicesList servicesText={SAMPLE_DATA.servicesText} accentColor={accentColor} eyebrowNumber={num()} />
        <PackagesSection packages={packages} accentColor={accentColor} eyebrowNumber={num()} />
        <TrustBadges testimonials={testimonials} accentColor={accentColor} eyebrowNumber={num()} />
        <LocationMap businessAddress={SAMPLE_DATA.businessAddress} accentColor={accentColor} eyebrowNumber={num()} />
        <PreviewLeadForm primaryColor={primaryColor} />
      </main>
    );
  }

  const template = getTemplate(templateId);
  if (!template) return notFound();

  const heroProps = {
    businessName: SAMPLE_DATA.businessName,
    logoUrl: null,
    headline: SAMPLE_DATA.headline,
    subheadline: SAMPLE_DATA.subheadline,
    ctaLabel: SAMPLE_DATA.ctaLabel,
    primaryColor,
    secondaryColor,
  };

  const checklistItems = SAMPLE_DATA.servicesText.split("\n");

  let sectionCount = 0;
  const nextNumber = () => String(++sectionCount).padStart(2, "0");

  const renderSection = (key: SectionKey) => {
    const number = nextNumber();
    switch (key) {
      case "about":
        return (
          <AboutSection
            businessName={SAMPLE_DATA.businessName}
            tagline={SAMPLE_DATA.tagline}
            aboutText={SAMPLE_DATA.aboutText}
            accentColor={accentColor}
            eyebrowNumber={number}
          />
        );
      case "story":
        return <StorySection storyText={SAMPLE_DATA.additionalNotes} accentColor={accentColor} eyebrowNumber={number} />;
      case "services":
        return <ServicesList servicesText={SAMPLE_DATA.servicesText} accentColor={accentColor} eyebrowNumber={number} />;
      case "packages":
        return <PackagesSection packages={packages} accentColor={accentColor} eyebrowNumber={number} />;
      case "trust":
        return <TrustBadges testimonials={testimonials} accentColor={accentColor} eyebrowNumber={number} />;
      case "location":
        return <LocationMap businessAddress={SAMPLE_DATA.businessAddress} accentColor={accentColor} eyebrowNumber={number} />;
      case "howItWorks":
        return <HowItWorksSection accentColor={accentColor} eyebrowNumber={number} />;
    }
  };

  return (
    <main>
      {template.hero === "minimal" && <MinimalHero {...heroProps} />}
      {template.hero === "split" && <SplitHero {...heroProps} photoUrl={SAMPLE_DATA.photoUrl} />}
      {template.hero === "editorial" && <EditorialHero {...heroProps} />}
      {template.hero === "dark" && <DarkHero {...heroProps} />}
      {template.hero === "compact" && <CompactHero {...heroProps} testimonialCount={testimonials.length} />}
      {template.hero === "geometric" && <GeometricHero {...heroProps} />}
      {template.hero === "checklist" && <ChecklistHero {...heroProps} checklistItems={checklistItems} />}
      {template.hero === "default" && (
        <ConversionHero {...heroProps} tagline={SAMPLE_DATA.tagline} ctaHref={template.ctaHref} />
      )}

      {template.sections.map((key) => (
        <div key={key}>{renderSection(key)}</div>
      ))}

      <PreviewLeadForm primaryColor={primaryColor} />
    </main>
  );
}
