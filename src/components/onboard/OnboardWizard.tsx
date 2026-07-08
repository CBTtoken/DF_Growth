"use client";

import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { Step1BusinessInfo } from "./steps/Step1BusinessInfo";
import { Step2BrandKit } from "./steps/Step2BrandKit";
import { Step3LandingCopy } from "./steps/Step3LandingCopy";
import { Step4MetaConnect } from "./steps/Step4MetaConnect";
import type { Tier } from "@/lib/paystack/plans";

export function OnboardWizard({
  startStep,
  tier,
  initialData,
}: {
  startStep: number;
  tier: Tier;
  initialData: {
    businessName: string;
    contactEmail: string;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    headline: string;
    subheadline: string;
    ctaLabel: string;
    metaPixelId: string;
    metaAdAccountId: string;
  };
}) {
  const totalSteps = tier === "foundation" ? 3 : 4;
  const [step, setStep] = useState(Math.min(startStep, totalSteps + 1));

  if (step > totalSteps) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold">You&apos;re all set</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Your account is active. Your landing page and dashboard are next — we&apos;ll be in
          touch as soon as they&apos;re ready to show you.
        </p>
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
        <Step2BrandKit
          initialPrimaryColor={initialData.brandPrimaryColor}
          initialSecondaryColor={initialData.brandSecondaryColor}
          onSuccess={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3LandingCopy
          initialHeadline={initialData.headline}
          initialSubheadline={initialData.subheadline}
          initialCtaLabel={initialData.ctaLabel}
          onSuccess={() => setStep(4)}
        />
      )}
      {step === 4 && tier !== "foundation" && (
        <Step4MetaConnect
          initialPixelId={initialData.metaPixelId}
          initialAdAccountId={initialData.metaAdAccountId}
          onSuccess={() => setStep(5)}
        />
      )}
    </div>
  );
}
