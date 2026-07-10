"use client";

import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { Step1BusinessInfo } from "./steps/Step1BusinessInfo";
import { Step2BusinessProfile } from "./steps/Step2BusinessProfile";
import { Step3BrandKit } from "./steps/Step3BrandKit";
import { Step4LandingCopy } from "./steps/Step4LandingCopy";
import { Step5Packages } from "./steps/Step5Packages";
import { Step6MetaConnect } from "./steps/Step6MetaConnect";
import type { Tier } from "@/lib/paystack/plans";

type PackageInitial = { name: string; price: string; description: string };

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
    logoUrl: string | null;
    headline: string;
    subheadline: string;
    aboutText: string;
    servicesText: string;
    ctaLabel: string;
    packages: PackageInitial[];
    metaPixelId: string;
    metaAdAccountId: string;
  };
}) {
  const totalSteps = tier === "foundation" ? 5 : 6;
  const [step, setStep] = useState(Math.min(startStep, totalSteps + 1));

  if (step > totalSteps) {
    const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${slug}`;
    return (
      <div className="relative flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h2 className="text-2xl font-bold tracking-tight text-ink">You&apos;re all set</h2>
        <p className="max-w-sm text-sm text-gray-500">
          Your account is active and your landing page is live right now.
        </p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          View your page
        </a>
        <p className="text-xs text-gray-400">{pageUrl}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <ProgressBar step={step} totalSteps={totalSteps} />
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">

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
          initialLogoUrl={initialData.logoUrl}
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
      {step === 5 && (
        <Step5Packages initialPackages={initialData.packages} onSuccess={() => setStep(6)} />
      )}
      {step === 6 && tier !== "foundation" && (
        <Step6MetaConnect
          initialPixelId={initialData.metaPixelId}
          initialAdAccountId={initialData.metaAdAccountId}
          onSuccess={() => setStep(7)}
        />
      )}
      </div>
    </div>
  );
}
