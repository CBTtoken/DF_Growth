"use client";

import { useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { Step1BusinessInfo } from "./steps/Step1BusinessInfo";
import { Step2BusinessProfile } from "./steps/Step2BusinessProfile";
import { Step3BrandKit } from "./steps/Step3BrandKit";
import { Step4PhotoUpload } from "./steps/Step4PhotoUpload";
import { Step4TemplatePicker } from "./steps/Step4TemplatePicker";
import { Step5LandingCopy } from "./steps/Step5LandingCopy";
import { Step6Packages } from "./steps/Step6Packages";
import { Step7MetaConnect } from "./steps/Step7MetaConnect";
import { StepPayment } from "./steps/StepPayment";
import type { Tier, BillingInterval } from "@/lib/paystack/plans";

type PackageInitial = { name: string; price: string; description: string; type?: "package" | "special" | "discount" };
type PhotoInitial = { id: string; storage_path: string };

export function OnboardWizard({
  startStep,
  tier,
  billingCycle,
  slug,
  photos,
  photosStorageBase,
  initialData,
}: {
  startStep: number;
  tier: Tier;
  billingCycle: BillingInterval;
  slug: string;
  photos: PhotoInitial[];
  photosStorageBase: string;
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
    template: string;
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
  // Sprint 1, Build Item 11: inserted a new Photo Upload step after Brand
  // Kit — bumped from 6/7 to 7/8. The template picker, landing copy,
  // packages, and Meta connect steps keep their existing component/action
  // names below (already position-decoupled, following the same pattern
  // saveStepTemplate established) — only the step===N branch numbers below
  // shift, nothing else needed renaming.
  //
  // Combined spec Sec 10: bumped 8 to 9 for non-foundation — payment is now
  // a real final step (StepPayment) after Meta Connect, not something that
  // already happened before the wizard even started.
  const totalSteps = tier === "foundation" ? 7 : 9;
  const [step, setStep] = useState(Math.min(startStep, totalSteps + 1));

  if (step > totalSteps) {
    const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${slug}`;
    return (
      <div className="relative flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h2 className="text-2xl font-bold tracking-tight text-ink">You&apos;re all set</h2>
        <p className="max-w-sm text-sm text-gray-500">
          Your account is active and your landing page is live right now. Your dashboard is
          where you&apos;ll manage testimonials, download your social assets, and check your ad
          tracking connection.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            Go to your dashboard
          </a>
          <a
            href={pageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
          >
            View your page
          </a>
        </div>
        <p className="text-xs text-gray-400">{pageUrl}</p>
      </div>
    );
  }

  // Combined spec Sec 9 (quick win): every other step fits the wizard's
  // normal max-w-lg card, but the template picker's live previews were
  // being squeezed into that same ~460px column, capping how large/clear
  // each preview could get. Widening just for this one step gives the
  // previews real room without changing the layout everywhere else.
  const isTemplateStep = step === 5;

  return (
    <div className={`flex w-full flex-col gap-6 ${isTemplateStep ? "max-w-2xl" : "max-w-lg"}`}>
      <ProgressBar step={step} totalSteps={totalSteps} />
      {/* Combined spec Sec 6: only shown once landing copy (internal step 6)
          has been saved — earlier than that /dashboard/preview would just
          show its "not enough to preview yet" message, which isn't useful
          to link to. */}
      {step >= 7 && (
        <a
          href="/dashboard/preview"
          target="_blank"
          rel="noreferrer"
          className="self-end text-sm font-semibold text-brand transition hover:text-brand-dark"
        >
          Preview your page ↗
        </a>
      )}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">

      {step === 1 && (
        <Step1BusinessInfo
          initialBusinessName={initialData.businessName}
          initialContactEmail={initialData.contactEmail}
          initialCallPhone={initialData.callPhone}
          initialWhatsappPhone={initialData.whatsappPhone}
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
          initialFacebookUrl={initialData.facebookUrl}
          initialInstagramUrl={initialData.instagramUrl}
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
        <Step4PhotoUpload initialPhotos={photos} storageBase={photosStorageBase} onSuccess={() => setStep(5)} />
      )}
      {step === 5 && (
        <Step4TemplatePicker initialTemplate={initialData.template} onSuccess={() => setStep(6)} />
      )}
      {step === 6 && (
        <Step5LandingCopy
          initialHeadline={initialData.headline}
          initialSubheadline={initialData.subheadline}
          initialCtaLabel={initialData.ctaLabel}
          initialAboutText={initialData.aboutText}
          initialServicesText={initialData.servicesText}
          hasAiDraft={Boolean(initialData.headline)}
          onSuccess={() => setStep(7)}
        />
      )}
      {step === 7 && (
        <Step6Packages initialPackages={initialData.packages} onSuccess={() => setStep(8)} />
      )}
      {step === 8 && tier !== "foundation" && (
        <Step7MetaConnect
          initialPixelId={initialData.metaPixelId}
          initialAdAccountId={initialData.metaAdAccountId}
          onSuccess={() => setStep(9)}
        />
      )}
      {step === 9 && tier !== "foundation" && <StepPayment tier={tier} billingCycle={billingCycle} />}
      </div>
    </div>
  );
}
