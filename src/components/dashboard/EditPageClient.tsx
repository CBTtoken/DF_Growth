"use client";

import { useState } from "react";
import { Step1BusinessInfo } from "@/components/onboard/steps/Step1BusinessInfo";
import { Step2BusinessProfile } from "@/components/onboard/steps/Step2BusinessProfile";
import { Step3BrandKit } from "@/components/onboard/steps/Step3BrandKit";
import { Step5LandingCopy } from "@/components/onboard/steps/Step5LandingCopy";
import { Step6Packages } from "@/components/onboard/steps/Step6Packages";

type PackageInitial = { name: string; price: string; description: string; type?: "package" | "special" | "discount" };

// Reuses the exact same components, schemas, and Server Actions as the
// onboarding wizard — found via UAT that there was no way at all to fix a
// typo, update an address, or run a special once onboarding finished.
// Each card saves independently (no wizard step-advancing here), and a
// shared toast confirms the save regardless of which card it came from,
// since these components are built to navigate forward on success, not to
// show their own inline confirmation.
export function EditPageClient({
  initialData,
}: {
  initialData: {
    businessName: string;
    contactEmail: string;
    callPhone: string;
    whatsappPhone: string;
    province: string;
    industry: string;
    businessAddress: string;
    businessDescription: string;
    tagline: string;
    productsServices: string;
    additionalNotes: string;
    facebookUrl: string;
    instagramUrl: string;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    logoUrl: string | null;
    headline: string;
    subheadline: string;
    aboutText: string;
    servicesText: string;
    ctaLabel: string;
    packages: PackageInitial[];
  };
}) {
  const [toastVisible, setToastVisible] = useState(false);

  const showSaved = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      {toastVisible && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          ✓ Saved
        </div>
      )}

      <a
        href="/dashboard/preview"
        target="_blank"
        rel="noreferrer"
        className="self-end text-sm font-semibold text-brand transition hover:text-brand-dark"
      >
        Preview your page ↗
      </a>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Step1BusinessInfo
          initialBusinessName={initialData.businessName}
          initialContactEmail={initialData.contactEmail}
          initialCallPhone={initialData.callPhone}
          initialWhatsappPhone={initialData.whatsappPhone}
          onSuccess={showSaved}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Step2BusinessProfile
          initialProvince={initialData.province}
          initialIndustry={initialData.industry}
          initialBusinessAddress={initialData.businessAddress}
          initialBusinessDescription={initialData.businessDescription}
          initialTagline={initialData.tagline}
          initialProductsServices={initialData.productsServices}
          initialAdditionalNotes={initialData.additionalNotes}
          initialFacebookUrl={initialData.facebookUrl}
          initialInstagramUrl={initialData.instagramUrl}
          onSuccess={showSaved}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Step3BrandKit
          initialPrimaryColor={initialData.brandPrimaryColor}
          initialSecondaryColor={initialData.brandSecondaryColor}
          initialLogoUrl={initialData.logoUrl}
          onSuccess={showSaved}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Step5LandingCopy
          initialHeadline={initialData.headline}
          initialSubheadline={initialData.subheadline}
          initialCtaLabel={initialData.ctaLabel}
          initialAboutText={initialData.aboutText}
          initialServicesText={initialData.servicesText}
          hasAiDraft={false}
          heading="Your current content on your landing page"
          onSuccess={showSaved}
          submitLabel="Save changes"
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Step6Packages initialPackages={initialData.packages} onSuccess={showSaved} submitLabel="Save changes" />
      </section>
    </div>
  );
}
