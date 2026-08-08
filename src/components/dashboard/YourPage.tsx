"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Step1BusinessInfo } from "@/components/onboard/steps/Step1BusinessInfo";
import { Step2BusinessProfile } from "@/components/onboard/steps/Step2BusinessProfile";
import { Step3BrandKit } from "@/components/onboard/steps/Step3BrandKit";
import { Step5LandingCopy } from "@/components/onboard/steps/Step5LandingCopy";
import { Step6Packages } from "@/components/onboard/steps/Step6Packages";
import {
  PAGE_SECTION_ORDER,
  type PageSectionKey,
  type SectionStatus,
} from "@/lib/page-readiness";

type PackageInitial = {
  name: string;
  price: string;
  description: string;
  type?: "package" | "special" | "discount" | "event";
};

export type YourPageInitialData = {
  businessName: string;
  contactEmail: string;
  callPhone: string;
  whatsappPhone: string;
  province: string;
  industry: string;
  businessAddress: string;
  city: string;
  businessDescription: string;
  tagline: string;
  productsServices: string;
  additionalNotes: string;
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
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

// Sprint "Member dashboard navigation", 8 August 2026. Dewald, on a phone:
// "the edit your page section, it is 1 looooooongggg scrolling page, can we
// not make it easier and better looking, menu driven, or page sections",
// and separately "Your page and Edit your page, is a bit confusing to have
// them in two separate places".
//
// This is both answers at once. /dashboard/edit stacked five wizard step
// components vertically; this shows the same five, plus the photos and page
// style that used to sit on a different tab, as six named sections with one
// open at a time. The step components, their schemas and their Server
// Actions are untouched and still shared with onboarding, exactly as the
// handoff required. All that changed is what a member sees at once.
//
// Closed sections are hidden with `hidden`, never unmounted. That is
// deliberate and is the interface standard's "never lose what somebody has
// typed, not on error, not on navigation": these are uncontrolled forms, so
// unmounting a half-filled section to open another would silently throw the
// typing away.
//
// Section names agreed with Dewald before any of this was written, per the
// standard's "describe the structure before you build it".
const SECTIONS: Record<
  PageSectionKey,
  {
    title: string;
    /**
     * What this section does to the public page, in the member's own words.
     * Dewald's ask: "something that make logical sense like they can see and
     * feel what they adding on their page." A field label on its own does
     * not tell you where the thing lands.
     */
    blurb: string;
  }
> = {
  photos: {
    title: "Your photos",
    blurb: "The pictures down your page, and the big one across the top.",
  },
  look: {
    title: "How your page looks",
    blurb: "Your page style, your two colours and your logo.",
  },
  details: {
    title: "Your details",
    blurb: "Your business name, and how a customer calls or WhatsApps you.",
  },
  about: {
    title: "Where you are, and what you do",
    blurb: "Your town, your trade, your short description and your social links.",
  },
  words: {
    title: "Your words",
    blurb: "One clear line on what you do, your story underneath, and the button text.",
  },
  prices: {
    title: "Your prices",
    blurb: "Packages, specials or events. Leave this out if you quote per job.",
  },
};

export function YourPage({
  initialData,
  status,
  initialOpen,
  photosSlot,
  styleSlot,
}: {
  initialData: YourPageInitialData;
  status: Record<PageSectionKey, SectionStatus>;
  /** From `?open=` on the URL, so the Home checklist can link straight in. */
  initialOpen: PageSectionKey | null;
  /** Rendered by the server page: the photo gallery. */
  photosSlot: ReactNode;
  /** Rendered by the server page: the page style picker. */
  styleSlot: ReactNode;
}) {
  const [open, setOpen] = useState<PageSectionKey | null>(initialOpen);
  const [toastVisible, setToastVisible] = useState(false);

  // Arriving from the Home checklist. That is a real navigation, so the
  // server hands down a new initialOpen, but this component is not
  // remounted and its own state would otherwise ignore it, leaving the URL
  // naming a section that is not open. Tapping a checklist item used to
  // drop Dewald at the top of the dashboard with no clue where to go next,
  // and landing on Your page with everything still shut would be the same
  // dead end wearing a different hat.
  //
  // Adjusted during render rather than in an effect, which is React's own
  // guidance for reacting to a changed prop: an effect would render once
  // with the wrong section open and then again with the right one.
  const [lastLinkedOpen, setLastLinkedOpen] = useState(initialOpen);
  if (initialOpen !== lastLinkedOpen) {
    setLastLinkedOpen(initialOpen);
    if (initialOpen) setOpen(initialOpen);
  }
  const headerRefs = useRef<Partial<Record<PageSectionKey, HTMLButtonElement | null>>>({});

  // The step components navigate forward on success in the wizard rather
  // than confirming in place, so one shared toast covers all six here.
  const showSaved = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const toggle = (key: PageSectionKey) => {
    const next = open === key ? null : key;
    setOpen(next);

    // history.replaceState rather than a router push: this keeps a refresh
    // and a shared link on the same section without asking the server to
    // rebuild the whole dashboard (one Promise.all of eighteen queries) for
    // what is a purely visual change.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "your-page");
    if (next) url.searchParams.set("open", next);
    else url.searchParams.delete("open");
    window.history.replaceState(null, "", url);

    if (next) {
      // Opening a section three down the list otherwise expands content
      // below the fold with no visible change on screen.
      requestAnimationFrame(() => {
        headerRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  // Scrolling is a change to the browser, not to React state, so this half
  // stays in an effect. It runs on arrival and again on each checklist link.
  useEffect(() => {
    if (!initialOpen) return;
    headerRefs.current[initialOpen]?.scrollIntoView({ block: "start" });
  }, [initialOpen]);

  const content: Record<PageSectionKey, ReactNode> = {
    photos: photosSlot,
    look: (
      <div className="flex flex-col gap-6">
        {styleSlot}
        <div className="border-t border-gray-100 pt-6">
          <Step3BrandKit
            initialPrimaryColor={initialData.brandPrimaryColor}
            initialSecondaryColor={initialData.brandSecondaryColor}
            initialLogoUrl={initialData.logoUrl}
            heading="Your colours and logo"
            onSuccess={showSaved}
            submitLabel="Save changes"
          />
        </div>
      </div>
    ),
    details: (
      <Step1BusinessInfo
        initialBusinessName={initialData.businessName}
        initialContactEmail={initialData.contactEmail}
        initialCallPhone={initialData.callPhone}
        initialWhatsappPhone={initialData.whatsappPhone}
        showHeading={false}
        onSuccess={showSaved}
        submitLabel="Save changes"
      />
    ),
    about: (
      <Step2BusinessProfile
        initialProvince={initialData.province}
        initialIndustry={initialData.industry}
        initialBusinessAddress={initialData.businessAddress}
        initialCity={initialData.city}
        initialBusinessDescription={initialData.businessDescription}
        initialTagline={initialData.tagline}
        initialProductsServices={initialData.productsServices}
        initialAdditionalNotes={initialData.additionalNotes}
        initialFacebookUrl={initialData.facebookUrl}
        initialInstagramUrl={initialData.instagramUrl}
        initialWebsiteUrl={initialData.websiteUrl}
        showHeading={false}
        onSuccess={showSaved}
        submitLabel="Save changes"
      />
    ),
    words: (
      <Step5LandingCopy
        initialHeadline={initialData.headline}
        initialSubheadline={initialData.subheadline}
        initialCtaLabel={initialData.ctaLabel}
        initialAboutText={initialData.aboutText}
        initialServicesText={initialData.servicesText}
        hasAiDraft={false}
        heading={null}
        onSuccess={showSaved}
        submitLabel="Save changes"
      />
    ),
    prices: (
      <Step6Packages
        initialPackages={initialData.packages}
        showHeading={false}
        onSuccess={showSaved}
        submitLabel="Save changes"
      />
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      {toastVisible && (
        <div
          role="status"
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          ✓ Saved
        </div>
      )}

      {/* Was a one-line subtitle that read as decoration. A member needs to
          know there is no draft state before they change anything, not
          after. */}
      <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm leading-relaxed text-gray-700">
        Anything you save here is <span className="font-semibold">live straight away</span> on your
        public page. There is no separate publish step.
      </p>

      <div className="flex flex-col gap-3">
        {PAGE_SECTION_ORDER.map((key) => {
          const section = SECTIONS[key];
          const state = status[key];
          const isOpen = open === key;

          return (
            <section
              key={key}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                isOpen ? "border-brand/40" : "border-gray-100"
              }`}
            >
              <button
                type="button"
                ref={(el) => {
                  headerRefs.current[key] = el;
                }}
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                aria-controls={`section-${key}`}
                className="flex w-full scroll-mt-20 items-center gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:px-6"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold tracking-tight text-ink">
                      {section.title}
                    </span>
                    {state.outstanding > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {state.outstanding} to add
                      </span>
                    ) : state.done ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                        <span
                          aria-hidden
                          className="grid size-4 place-items-center rounded-full bg-green-600 text-[9px] font-bold text-white"
                        >
                          ✓
                        </span>
                        Done
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs leading-relaxed text-gray-500">{section.blurb}</span>
                </span>
                <span
                  aria-hidden
                  className={`shrink-0 text-lg text-gray-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {/* Hidden, not unmounted: see the note at the top of this file. */}
              <div
                id={`section-${key}`}
                hidden={!isOpen}
                className="border-t border-gray-100 px-4 py-5 sm:px-6"
              >
                {content[key]}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
