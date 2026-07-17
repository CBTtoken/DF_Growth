import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

const PAGE_TITLE = "How It Works";
const PAGE_DESCRIPTION =
  "A plain-language, step-by-step walkthrough of exactly what happens when you join DigitalFlyer — no tech skills needed.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: "/how-it-works" },
  twitter: { title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

export const revalidate = 3600;

// UI/UX pass, 2026-07-17: Dewald's explicit ask — "our users are not
// computer wizards, it really needs to be super clear and easy to
// follow" — is the design brief for this entire page, not just its copy.
// Every step gets: a real screenshot of the actual product (not a mockup
// — this audience needs to trust that what they'll see matches exactly
// what's shown here), one plain headline phrased the way a person would
// actually ask the question, and 1-2 short sentences, no jargon. The
// homepage's own "How It Works" section stays a quick 4-step teaser
// (src/app/pricing/page.tsx) — this is the full, unhurried version for
// anyone who wants to see every screen before they commit.
type Step = {
  number: string;
  title: string;
  body: string;
  // Path under /public — filled in once real screenshots are captured.
  // See ScreenshotFrame for the placeholder shown until then.
  screenshotSrc: string | null;
  screenshotAlt: string;
};

const STEPS: Step[] = [
  {
    number: "1",
    title: "Pick The Plan That Fits Today",
    body: "Choose Foundation or Growth. Foundation is completely free for your first 7 days, no card needed. You're never locked in, change your mind any time.",
    screenshotSrc: null,
    screenshotAlt: "The DigitalFlyer pricing page showing Foundation and Growth plans",
  },
  {
    number: "2",
    title: "Tell Us A Bit About Your Business",
    body: "A short, friendly form. Your business name, what you do, where you're based, how customers can reach you. Nothing complicated, and you can always come back and change it later.",
    screenshotSrc: null,
    screenshotAlt: "The onboarding form asking for basic business details",
  },
  {
    number: "3",
    title: "Make It Look Like You",
    body: "Pick your business colours, upload your logo if you have one, and choose a design you like from real, ready-made layouts. Add a few photos, or search thousands of free stock photos right there if you don't have your own yet.",
    screenshotSrc: null,
    screenshotAlt: "The template and photo picker showing real layout options",
  },
  {
    number: "4",
    title: "Add A Few Words About What You Do",
    body: "Tell customers what makes you worth choosing. Stuck for the right words? We'll write a first draft for you automatically, you just read it over and make it sound like you.",
    screenshotSrc: null,
    screenshotAlt: "The landing copy step showing an AI-drafted description",
  },
  {
    number: "5",
    title: "Add Your Packages (Optional)",
    body: "Have set prices, service packages, or a special offer running? Add up to three. Don't have a fixed price list? Skip this too, plenty of businesses do, and you can always add some later.",
    screenshotSrc: null,
    screenshotAlt: "The packages step showing three package slots",
  },
  {
    number: "6",
    title: "Confirm And You're Set",
    body: "On Foundation, there's nothing to pay today, your page goes live straight away. On Growth, this is one quick, secure payment through Paystack, the same trusted system thousands of South African businesses already use.",
    screenshotSrc: null,
    screenshotAlt: "The final confirmation screen showing your page is live",
  },
  {
    number: "7",
    title: "You're Live — Here's Your Dashboard",
    body: "Your page is live and ready to share on WhatsApp, Facebook, anywhere. From your dashboard, you can edit anything, add customer reviews, download ready-made social media posts, and see who's been visiting your page.",
    screenshotSrc: null,
    screenshotAlt: "The client dashboard after signup is complete",
  },
];

// A simple "browser chrome" frame around each screenshot — three dots up
// top, like a real browser window — so even the placeholder state reads
// as "this is what your screen will look like," not a broken image.
function ScreenshotFrame({ step }: { step: Step }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-gray-300" aria-hidden />
        <span className="size-2.5 rounded-full bg-gray-300" aria-hidden />
        <span className="size-2.5 rounded-full bg-gray-300" aria-hidden />
      </div>
      {step.screenshotSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- real screenshots vary in aspect ratio; intrinsic sizing over a fixed next/image box.
        <img src={step.screenshotSrc} alt={step.screenshotAlt} className="w-full" />
      ) : (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 bg-gray-50 px-6 text-center">
          <span className="text-3xl" aria-hidden>
            📸
          </span>
          <p className="text-sm font-medium text-gray-400">Screenshot coming soon</p>
        </div>
      )}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-gray-50 px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">How It Works</span>
          <h1 className="font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">
            No Tech Skills Needed
          </h1>
          <p className="max-w-xl text-base text-gray-600 sm:text-lg">
            If you can use WhatsApp, you can do this. Here&apos;s exactly what happens, screen by screen, from
            start to a live page.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-gray-500">
            <span>⏱️ About 10 minutes</span>
            <span>💳 No card needed to start</span>
            <span>↩️ Stop and come back any time</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-20">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`grid items-center gap-8 sm:grid-cols-2 sm:gap-14 ${i % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <span className="grid size-11 place-items-center rounded-full bg-brand font-display text-lg text-white">
                  {step.number}
                </span>
                <h2 className="mt-4 font-display text-2xl uppercase tracking-wide text-ink sm:text-3xl">
                  {step.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-gray-600">{step.body}</p>
              </div>
              <ScreenshotFrame step={step} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand px-6 py-16 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h2 className="font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
            Ready To See It For Yourself?
          </h2>
          <p className="text-lg text-white/85">Start free, no card needed. You&apos;ll be live in about 10 minutes.</p>
          <Link
            href="/pricing#pricing"
            className="mt-2 inline-block rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
