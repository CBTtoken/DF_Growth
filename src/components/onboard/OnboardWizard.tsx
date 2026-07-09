"use client";

import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { Step1BusinessInfo } from "./steps/Step1BusinessInfo";
import { Step2BusinessProfile } from "./steps/Step2BusinessProfile";
import { Step3BrandKit } from "./steps/Step3BrandKit";
import { Step4LandingCopy } from "./steps/Step4LandingCopy";
import { Step5MetaConnect } from "./steps/Step5MetaConnect";
import type { Tier } from "@/lib/paystack/plans";

export function OnboardWizard({
  startStep,
  tier,
  slug,
  initialData,
}: {
  startStep: number;
  tier: Tier;
  slug: string;
  initialData: {
    businessName: string;
    contactEmail: string;
    province: string;
    industry: string;
    businessAddress: string;
    businessDescription: string;
    tagline: string;
    productsServices: string;
    additionalNotes: string;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    headline: string;
    subheadline: string;
    aboutText: string;
    servicesText: string;
    ctaLabel: string;
    metaPixelId: string;
    metaAdAccountId: string;
  };
}) {
  const totalSteps = tier === "foundation" ? 4 : 5;
  const [step, setStep] = useState(Math.min(startStep, totalSteps + 1));

  if (step > totalSteps) {
    const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${slug}`;
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold">You&apos;re all set</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Your account is active and your landing page is live right now.
        </p>
        <a href={pageUrl} target="_blank" rel="noreferrer" className="text-sm font-medium underline">
          {pageUrl}
        </a>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <ProgressBar step={step} totalSteps={totalSteps} />

      {step === 1 && (
        <Step1BusinessInfo
          initialBusinessName={initialData.businessName}
          initialContactEmail={initialData.contactEmail}
          onSuccess={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2BusinessProfile
          initialProvince={initialData.province}
          initialIndustry={initialData.industry}
          initialBusinessAddress={initialData.businessAddress}
          initialBusinessDescription={initialData.businessDescription}
          initialTagline={initialData.tagline}
          initialProductsServices={initialData.productsServices}
          initialAdditionalNotes={initialData.additionalNotes}
          onSuccess={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3BrandKit
          initialPrimaryColor={initialData.brandPrimaryColor}
          initialSecondaryColor={initialData.brandSecondaryColor}
          onSuccess={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <Step4LandingCopy
          initialHeadline={initialData.headline}
          initialSubheadline={initialData.subheadline}
          initialCtaLabel={initialData.ctaLabel}
          initialAboutText={initialData.aboutText}
          initialServicesText={initialData.servicesText}
          hasAiDraft={Boolean(initialData.headline)}
          onSuccess={() => setStep(5)}
        />
      )}
      {step === 5 && tier !== "foundation" && (
        <Step5MetaConnect
          initialPixelId={initialData.metaPixelId}
          initialAdAccountId={initialData.metaAdAccountId}
          onSuccess={() => setStep(6)}
        />
      )}
    </div>
  );
}
