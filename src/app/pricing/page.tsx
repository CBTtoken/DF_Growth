import { Layout, Store, Target, TrendingUp, MapPin, Receipt, Sprout, Network, Check } from "lucide-react";
import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { HeroSwoosh } from "@/components/brand/HeroSwoosh";
import { EcosystemAccess } from "@/components/EcosystemAccess";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

const TRUST_INDICATORS = [
  "Professional Business Page",
  "Included in the DigitalFlyer Marketplace",
  "Lead Generation Page",
  "No Hidden Fees",
  "Built in South Africa",
];

const STARTER_FEATURES = [
  {
    icon: Layout,
    title: "Professional Business Page",
    description: "Your own modern online business profile that's easy to share with customers.",
  },
  {
    icon: Store,
    title: "DigitalFlyer Marketplace",
    description:
      "Every member is automatically included in the DigitalFlyer Marketplace, making it easier for customers to discover your business.",
  },
  {
    icon: Target,
    title: "Lead Generation Page",
    description: "A dedicated landing page designed to turn visitors into real enquiries.",
  },
  {
    icon: TrendingUp,
    title: "Built To Grow",
    description:
      "As your business grows, DigitalFlyer grows with you through marketing tools, networking opportunities and future business features.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: MapPin,
    title: "Built For South Africa",
    description: "Designed specifically for South African entrepreneurs and small businesses.",
  },
  {
    icon: Receipt,
    title: "Transparent Pricing",
    description: "No hidden fees. No confusing contracts. No surprises.",
  },
  {
    icon: Sprout,
    title: "Start Small",
    description: "Only pay for what your business needs today. Upgrade whenever you're ready.",
  },
  {
    icon: Network,
    title: "More Than Software",
    description:
      "You're joining a growing business ecosystem built to enable and connect South African business owners.",
  },
];

// "Our WhatsApp onboarding" from the original brief was adjusted to match
// what's actually live today — the real signup (Foundation's no-card trial,
// Growth/Enterprise's Paystack checkout) is a web flow, not WhatsApp. Swap
// this copy back once WhatsApp is the live entry point.
const FAQS = [
  {
    question: "What is DigitalFlyer?",
    answer:
      "DigitalFlyer is a business platform that helps South African businesses build their online presence, get discovered by customers and grow through one connected ecosystem.",
  },
  {
    question: "Do I need a website already?",
    answer: "No. DigitalFlyer creates your professional online presence for you.",
  },
  {
    question: "Is the Marketplace included?",
    answer: "Yes. Every DigitalFlyer member is automatically included in the DigitalFlyer Marketplace.",
  },
  {
    question: "What is a Founding Business?",
    answer:
      "Our first 10 Founding Businesses are helping launch DigitalFlyer. They'll receive exclusive launch recognition, early access to new features and Founding Member benefits.",
  },
  {
    question: "Can I cancel at any time?",
    answer: "Yes. There are no long-term contracts. You can cancel whenever you choose.",
  },
  {
    question: "Will customers be able to find my business?",
    answer:
      "Yes. Your business is designed to be shared across social media, messaging apps and discovered through online search.",
  },
  {
    question: "Do I need to run advertising?",
    answer:
      "No. Foundation is perfect for businesses wanting to build their online presence first. Growth is available whenever you're ready.",
  },
  {
    question: "How long does setup take?",
    answer: "Only a few minutes — our online signup walks you through everything, step by step.",
  },
  {
    question: "Are there any hidden costs?",
    answer: "Never. Transparency is one of our core values.",
  },
  {
    question: "Why should I join now?",
    answer:
      "We're only inviting our first 10 Founding Businesses during launch. Joining now means you'll help shape DigitalFlyer from the beginning while receiving exclusive Founding Member benefits.",
  },
];

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      {/* Hero — the official brand blue, not the near-black block this
          section used before. Same swoosh decoration, same pill-button
          language, just the actual "official colours" instead of a neutral
          dark that was never really one of the two brand hues. */}
      <section className="relative overflow-hidden bg-brand px-6 py-24 text-center sm:py-32">
        <HeroSwoosh />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
          <h1 className="font-display text-4xl uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
            Build Your Presence.
            <br />
            Grow Your Business.
          </h1>
          <p className="max-w-xl text-lg text-white/85">
            DigitalFlyer helps South African businesses build a professional online presence, connect
            with customers, generate leads and grow — all from one place.
          </p>

          <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {TRUST_INDICATORS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-white/90">
                <Check className="size-4 flex-shrink-0 text-spark" strokeWidth={3} aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <a
            href="#pricing"
            className="mt-2 rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            Become a Founding Business
          </a>
          <p className="max-w-md text-sm text-white/70">
            We&apos;re looking for our first 10 Founding Businesses to help launch DigitalFlyer. Join
            us and help shape the future of a platform built specifically for South African
            businesses.
          </p>
        </div>
      </section>

      {/* Why DigitalFlyer — the one narrative block on the page with no
          card/grid structure, deliberately: this is the "conversation"
          moment the brief asks for, not another scannable module. */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 text-center">
          <h2 className="font-display text-3xl uppercase tracking-wide text-ink">Why DigitalFlyer?</h2>
          <p className="text-lg leading-relaxed text-gray-600">
            Running a small business isn&apos;t easy. Every day thousands of business owners post in
            Facebook groups, reply in WhatsApp chats and rely on word of mouth, hoping the next
            customer finds them.
          </p>
          <p className="text-lg leading-relaxed text-gray-600">We believe there should be a better way.</p>
          <p className="text-lg leading-relaxed text-gray-600">
            DigitalFlyer was built to <strong className="text-ink">Enable &amp; Connect</strong> South
            African Business — not by replacing the tools you already use, but by giving every
            business one professional online home where customers can find you, trust you and connect
            with you.
          </p>
        </div>
      </section>

      {/* Everything Starts Here — light blue tint (5% brand) rather than the
          usual gray-50, so the palette carries through even in a "neutral"
          section instead of defaulting to a generic gray. */}
      <section className="bg-brand/5 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">Everything Starts Here</h2>
            <p className="mt-3 text-gray-600">
              Every DigitalFlyer member receives the foundations needed to build a stronger online
              business.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {STARTER_FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-base font-bold tracking-tight text-ink">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — the plain-language explainer above the cards does the
          persuading; the cards themselves just need to be scannable. Cards
          unchanged structurally per the brief, only copy/labels updated. */}
      <section id="pricing" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              Start Where Your Business Is Today
            </h2>
            <p className="mt-3 text-gray-600">
              You don&apos;t need a huge budget. You don&apos;t need an expensive marketing agency.
              You don&apos;t need to know everything about digital marketing. Simply choose the
              package that fits your business today and upgrade whenever you&apos;re ready.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TIERS.map((t) => (
              <TierCard
                key={t.id}
                tier={t.id}
                name={t.name}
                priceLabel={t.priceLabel}
                description={t.description}
                features={t.features}
                ctaLabel={t.ctaLabel}
                highlighted={t.id === "growth_engine"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Businesses Choose DigitalFlyer — same light-tint rhythm as
          "Everything Starts Here", alternating with the white/gray-50
          sections around it. */}
      <section className="bg-brand/5 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl uppercase tracking-wide text-ink">
            Why Businesses Choose DigitalFlyer
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-10">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="flex items-start gap-4">
                <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                  <d.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-ink">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-display text-3xl uppercase tracking-wide text-ink">
            Frequently Asked Questions
          </h2>
          <div className="mt-10">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* Ecosystem access — kept from the previous page, still true and
          still relevant right before the final push. */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              What you also get access to.
            </h2>
            <p className="mt-3 text-gray-600">
              Growth is part of the wider DigitalFlyer SA ecosystem — every client can also tap into
              these.
            </p>
          </div>
          <div className="mt-10">
            <EcosystemAccess />
          </div>
        </div>
      </section>

      {/* Final CTA — bookends the hero with the same brand-blue treatment. */}
      <section className="bg-brand px-6 py-20 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h2 className="font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
            Every Business Starts Somewhere.
          </h2>
          <p className="text-lg text-white/85">Today could be the day more customers start finding yours.</p>
          <p className="text-lg text-white/85">
            Become one of our first Founding Businesses and help us build the future of South African
            business.
          </p>
          <a
            href="#pricing"
            className="mt-4 inline-block rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            Become a Founding Business
          </a>
          <p className="mt-1 text-sm text-white/70">Your DigitalFlyer journey starts in just a few minutes.</p>
        </div>
      </section>
    </main>
  );
}
