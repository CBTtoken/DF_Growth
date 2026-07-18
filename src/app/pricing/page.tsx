import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Receipt, Sprout, Network, Star, Globe, BarChart3, Radar, CalendarDays, Users } from "lucide-react";
import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { HomepageCredibilitySection } from "@/components/marketing/HomepageCredibilitySection";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SectionDivider } from "@/components/marketing/SectionDivider";
import { SiteFooter } from "@/components/SiteFooter";
import { GetInTouchSection } from "@/components/marketing/GetInTouchSection";
import { SHOWCASE_SAMPLES } from "@/lib/templates/sample-showcase";

// Combined spec Sec 16: factual one-liners for the footer section, now
// that persuasion for these three lives in the pricing cards themselves —
// "what does this actually do?", not a second sales pitch.
const ECOSYSTEM_QUICK_REFERENCE = [
  {
    name: "DigitalFlyer Marketplace",
    description: "A shared directory where customers can discover your business alongside other DigitalFlyer members.",
  },
  {
    name: "RE:Biz Nomads",
    description: "A private community of South African business owners, deals, support, and real conversations.",
  },
  {
    name: "BizUp",
    description: "In-chat messaging and payments, so you can talk to and get paid by customers in one place.",
  },
];

// UI/UX pass, 2026-07-17: rewritten from a 4-card pain-point grid (which
// read as generic marketing copy, and duplicated a headline pattern also
// used by the pricing section and the now-removed "Everything Starts
// Here") into an actual narrative — short, scannable "sound familiar?"
// beats a reader recognises themselves in, not abstract categories.
// Deliberately short lines (this isn't prose to read start-to-finish,
// it's a list to nod along to).
const SOUND_FAMILIAR = [
  "It's 9pm and you're still replying to WhatsApp messages about tomorrow's booking.",
  "Your best post is three scrolls down a Facebook feed by the time anyone new sees it.",
  "A competitor with a worse product wins the sale, only because they had somewhere to send people.",
  "Someone asks \"do you have a website?\" and you don't know what to say.",
];

// Three real, live-rendered templates (same /preview/[templateId] route the
// picker uses) so a visitor sees an actual page, not a mockup, before ever
// signing up. Picked deliberately for maximum visual contrast at a glance,
// not just three different hero colours — found via UAT that Social Proof
// and Left-Split looked "boring and the same" side by side since both are
// light-card layouts built from the client's own brand colour. Dark Mode,
// Vibrant Geometric, and Storyteller each have a genuinely different
// background, layout, and typography treatment regardless of colour.
//
// Combined spec Sec 36: now points at three honestly-labeled sample
// businesses (src/lib/templates/sample-showcase.ts) instead of the bare
// template-picker previews — Growth has no real, permission-granted client
// pages yet, so this is fictional-but-clearly-marked content rather than
// the shared picker business shown three times.
const TEMPLATE_SHOWCASE = Object.values(SHOWCASE_SAMPLES);

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

// UI/UX pass, 2026-07-17: quick homepage-only step overview — Dewald wants
// a full illustrated walkthrough (its own page, with real product
// screenshots) as a later, separate build; this is deliberately just the
// four-step shape, not that page.
const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Select Your Membership",
    description: "Choose Foundation or Growth, whichever fits your business today. Change any time.",
  },
  {
    step: "2",
    title: "Complete The Onboarding Prompts",
    description: "A guided step-by-step wizard captures your business details, brand look and content in minutes.",
  },
  {
    step: "3",
    title: "Pay",
    description: "Simple, secure checkout via Paystack. Foundation starts free for 7 days, no card required.",
  },
  {
    step: "4",
    title: "Review, Edit & Share",
    description: "Preview your page, make any changes you like, then start sharing your link everywhere.",
  },
];

// UI/UX pass, 2026-07-17: "brag, don't sell" — real technical substance
// already built and live (SEO structured data, page-view tracking, Meta's
// server-side Conversions API), framed as outcomes a business owner
// actually cares about rather than jargon, with no implementation detail
// that would hand a competitor the how. Kept factual, not "unlock/
// supercharge" sales language — every claim here is something this
// platform genuinely does today, not aspirational.
const ONLINE_POWER = [
  {
    icon: Star,
    title: "Your Reviews, Right In Google Search",
    description:
      "Real reviews build real trust — and once you've got them, your page is built to hand Google exactly what it needs to show your star rating directly in search results, not buried on a review site nobody visits.",
  },
  {
    icon: Globe,
    title: "Built To Actually Get Found",
    description:
      "Every page is set up the way search engines expect from the moment it goes live — the technical groundwork is already done, not something you have to figure out or pay someone else for later.",
  },
  {
    icon: BarChart3,
    title: "See What's Actually Working",
    description:
      "Real visitor numbers, right in your own dashboard. No separate analytics account to create, no new dashboard to learn — just your numbers, whenever you want them.",
  },
  {
    icon: Radar,
    title: "Ads That Track Properly",
    description:
      "Run Meta ads and know they're actually being counted — tracking that holds up against today's privacy browsers and ad blockers, not just a pixel that quietly stops reporting half your results.",
  },
];

const PAGE_TITLE = "Build Your Presence. Grow Your Business.";
const PAGE_DESCRIPTION =
  "DigitalFlyer helps South African businesses build a professional online presence, connect with customers, generate leads and grow, all from one place.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: "/pricing" },
  twitter: { title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

// Sprint 1, Build Item 1 (4.4): live, accurate "X of 10 remaining" counter,
// not hardcoded or manually updated. Cached with the same 60s revalidation
// window used for client pages, rather than querying on every request.
export const revalidate = 60;

// Sprint 1, Build Item 3: real client testimonials Dewald has flagged as
// homepage-worthy — see HomepageCredibilitySection for why this is
// cross-tenant (unlike every other testimonials query in this codebase,
// which is scoped to one growth_client_id).
async function getFeaturedTestimonials() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("testimonials")
    .select("id, author_name, quote, rating")
    .eq("featured_on_homepage", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

type RealClientPage = { slug: string; businessName: string };

// UI/UX pass, 2026-07-17: "See It In Action" used to show three fictional
// sample businesses (src/lib/templates/sample-showcase.ts) — Dewald asked
// to replace them with real, actually-visited client pages once there are
// enough of them. No SQL aggregate/RPC exists for "most-viewed client" yet,
// and page_views volume at this stage of a public beta is small enough
// that counting client-side over the most recent rows is cheap and
// accurate — revisit with a real aggregate query if that stops being true.
// Falls back to the fictional samples (getTopVisitedClientPages returning
// too few) rather than ever rendering an empty or half-populated section.
async function getTopVisitedClientPages(limit = 3): Promise<RealClientPage[]> {
  const admin = createAdminClient();
  const { data: views } = await admin.from("page_views").select("growth_client_id").limit(5000);
  if (!views || views.length === 0) return [];

  const counts = new Map<string, number>();
  for (const v of views) {
    counts.set(v.growth_client_id, (counts.get(v.growth_client_id) ?? 0) + 1);
  }
  const rankedIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  if (rankedIds.length === 0) return [];

  const { data: clients } = await admin
    .from("growth_clients")
    .select("id, business_name, slug")
    .in("id", rankedIds.slice(0, limit * 3))
    .eq("status", "active")
    .not("slug", "is", null);
  if (!clients) return [];

  const rank = new Map(rankedIds.map((id, i) => [id, i]));
  return clients
    .filter((c): c is typeof c & { slug: string } => !!c.slug)
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
    .slice(0, limit)
    .map((c) => ({ slug: c.slug, businessName: c.business_name }));
}

export default async function PricingPage() {
  const [featuredTestimonials, topVisitedPages] = await Promise.all([
    getFeaturedTestimonials(),
    getTopVisitedClientPages(),
  ]);
  const showRealPages = topVisitedPages.length >= 2;
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      {/* Hero — UI/UX pass 2026-07-17: the 6 trust-indicator chips that
          used to live here are gone — "Why Businesses Choose DigitalFlyer"
          and "Real Online Power" (moved up next, real color treatment)
          now make the same case in far more depth, right below. A shorter
          hero gets a first-time visitor to that punch faster instead of
          making them scroll past a preview of it first. */}
      <section className="relative overflow-hidden bg-brand px-6 py-20 text-center sm:py-24">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-[26rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
          <h1 className="font-display text-4xl uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
            Build Your Presence.
            <br />
            Grow Your Business.
          </h1>
          <p className="max-w-xl text-lg text-white/85">
            DigitalFlyer helps South African businesses build a professional online presence, connect
            with customers, generate leads and grow, all from one place.
          </p>

          <a
            href="#pricing"
            className="mt-3 rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            See Pricing
          </a>
          {/* Combined spec Sec 15: confirmed replacement copy, slightly
              larger than before (text-sm to text-base). */}
          <p className="max-w-md text-base text-white/70">
            We built DigitalFlyer to help South African businesses get found, get trusted, and grow.
          </p>
        </div>
      </section>

      {/* Why Businesses Choose DigitalFlyer — UI/UX pass 2026-07-17: moved
          up from below pricing to right after the hero, and given the
          bold "ink" (near-black) treatment the brand's own design language
          already reserves for confident, high-contrast moments — the
          first real "pop" a visitor hits, seconds after landing. */}
      <section className="bg-ink px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl uppercase tracking-wide text-white">
            Why Businesses Choose DigitalFlyer
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="flex items-start gap-4">
                <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-spark text-ink">
                  <d.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — UI/UX pass 2026-07-17: a clean white "beat" between
          the two bold color sections, deliberately simple (no screenshots,
          no illustration) per Dewald's ask — a full illustrated walkthrough
          with real product screenshots is planned as its own separate page
          later, linked from its own nav item once built. This is just
          enough to answer "okay, so how does this actually work?" without
          leaving the homepage. */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl uppercase tracking-wide text-ink">How It Works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
            From sign up to sharing your link, most businesses are live the same day.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-4 sm:gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                <span className="grid size-10 flex-shrink-0 place-items-center rounded-full bg-brand font-display text-base text-white">
                  {s.step}
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/how-it-works" className="text-sm font-semibold text-brand hover:underline">
              See every real screen, step by step →
            </Link>
          </div>
        </div>
      </section>

      {/* Real Online Power — UI/UX pass 2026-07-17: the second "pop"
          section, solid spark (amber) rather than a soft tint, for real
          contrast against the ink section above and the white one below —
          a deliberate two-beat color moment right up front, not just
          another alternating-tint rhythm section. */}
      <section className="bg-spark px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-badge text-xs uppercase tracking-widest text-ink/70">Real Online Power</span>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-ink">
              This Isn&apos;t Just A Webpage
            </h2>
            <p className="mt-3 text-ink/80">
              Every DigitalFlyer page comes with the real technical groundwork most small businesses never get
              around to — built in from day one, not an upsell.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10">
            {ONLINE_POWER.map((d) => (
              <div key={d.title} className="flex items-start gap-4">
                <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-ink text-white">
                  <d.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-ink">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner A — UI/UX pass 2026-07-17: new, compact (not a full
          section) strike-while-hot moment right after the two pop
          sections, while that credibility punch is freshest. Deliberately
          shorter padding than a content section so it reads as a beat, not
          another block to read. */}
      <section className="bg-brand-dark px-6 py-10 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">Ready To Join?</h2>
          <a
            href="#pricing"
            className="rounded-full bg-spark px-7 py-2.5 text-sm font-semibold text-ink transition hover:bg-spark-dark hover:text-white sm:text-base"
          >
            Start Your Free Trial
          </a>
        </div>
      </section>

      <SectionDivider />

      {/* Sound Familiar — UI/UX pass 2026-07-17: rewritten per Dewald's
          note that the old pain-points grid "didn't read" — this is a
          narrative a reader recognises themselves in, not a feature-style
          card grid (deliberately the one section on this page that isn't
          an icon grid, for real visual variety too). Two-column on desktop:
          the story on the left, a short "sound familiar?" checklist on the
          right that stays scannable for anyone skimming past the prose.
          "Everything Starts Here" (the section that used to sit here) is
          gone entirely — its content just repeated what "Why Businesses
          Choose DigitalFlyer" and the Foundation pricing card already say. */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 sm:items-center sm:gap-14">
          <div>
            <span className="font-badge text-xs uppercase tracking-widest text-brand">Sound Familiar?</span>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-ink">
              You&apos;re Great At What You Do
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              You didn&apos;t start your business to become a marketer. You started it because you&apos;re
              good at what you do, not because you wanted a second job replying to messages at midnight
              and hoping the right people see your next post before it disappears.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              DigitalFlyer gives your business the one thing every one of those moments was missing: a
              real place customers can find you, trust you, and reach you, whether you&apos;re online to
              answer or not.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {SOUND_FAMILIAR.map((line) => (
              <li key={line} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <span className="mt-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand" aria-hidden>
                  ✓
                </span>
                <p className="text-sm leading-relaxed text-gray-700">{line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* See It In Action — UI/UX pass 2026-07-17: shows real, actually-
          visited member pages once there are enough of them (>=2), instead
          of the fictional samples — a real business's real page is a far
          stronger proof point than a mockup. Falls back to the sample
          businesses below while the real pool is still too thin to be a
          fair "most visited" list. */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              {showRealPages ? "Our Most Visited Pages" : "See It In Action"}
            </h2>
            <p className="mt-3 text-gray-600">
              {showRealPages
                ? "Real DigitalFlyer members, real pages, real customers finding them."
                : "Real layouts, not mockups, built with sample businesses so you can see a full page in action."}
            </p>
          </div>
          {showRealPages ? (
            // Real UAT fix, 2026-07-17: this used to iframe the real
            // client page directly, the same trick the fictional sample
            // cards below still use safely (/sample/[slug] has a
            // dedicated CSP frame-ancestors exception in next.config.ts).
            // Real client slugs never got that same exception — they're
            // top-level dynamic routes indistinguishable, at the CSP
            // config level, from every static top-level route (dashboard,
            // login, admin...), so there's no safe narrow pattern to add
            // without also loosening clickjacking protection somewhere it
            // shouldn't be. This exact bug (a same-origin iframe silently
            // blocked by the site's own default frame-ancestors 'none')
            // has already hit two other routes before — rather than add a
            // third one-off carve-out to maintain forever, real pages get
            // a simple card instead: no iframe, no CSP dependency at all,
            // can't break this way again.
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {topVisitedPages.map((t) => (
                <a
                  key={t.slug}
                  href={`/${t.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-32 items-center justify-center bg-brand/5 text-3xl font-display uppercase text-brand">
                    {t.businessName.slice(0, 2)}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">{t.businessName}</span>
                    <span className="text-xs font-semibold text-brand opacity-0 transition group-hover:opacity-100">
                      View full page ↗
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {TEMPLATE_SHOWCASE.map((t) => (
                <a
                  key={t.slug}
                  href={`/sample/${t.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative overflow-hidden bg-gray-50" style={{ height: 760 * 0.3 }}>
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-ink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Sample
                    </span>
                    <iframe
                      src={`/sample/${t.slug}`}
                      title={t.businessName}
                      loading="lazy"
                      tabIndex={-1}
                      style={{
                        width: 1200,
                        height: 760,
                        transform: "scale(0.3)",
                        transformOrigin: "top left",
                        pointerEvents: "none",
                        border: 0,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">{t.businessName}</span>
                    <span className="text-xs font-semibold text-brand opacity-0 transition group-hover:opacity-100">
                      View full page ↗
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-sm text-gray-500">
            10 styles available. Choose yours during signup, change any time.
          </p>
        </div>
      </section>

      <SectionDivider />

      <HomepageCredibilitySection testimonials={featuredTestimonials} />

      {/* CTA Banner B — UI/UX pass 2026-07-17: second new strike point,
          right after real proof (testimonials) and right before the
          pricing cards themselves — "you've seen it works, here's the
          price" is the natural next beat. */}
      <section className="bg-brand-dark px-6 py-10 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
            You&apos;ve Seen What&apos;s Possible.
          </h2>
          <p className="text-sm text-white/80 sm:text-base">Your business could be next. Takes less than 5 minutes.</p>
          <a
            href="#pricing"
            className="mt-1 rounded-full bg-spark px-7 py-2.5 text-sm font-semibold text-ink transition hover:bg-spark-dark hover:text-white sm:text-base"
          >
            See Pricing &amp; Join
          </a>
        </div>
      </section>

      {/* Pricing — the plain-language explainer above the cards does the
          persuading; the cards themselves just need to be scannable. Cards
          unchanged structurally per the brief, only copy/labels updated. */}
      <section id="pricing" className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              Start Where Your Business Is Today
            </h2>
            <p className="mt-3 text-gray-600">
              You don&apos;t need a huge budget, an expensive marketing agency, or to know everything
              about digital marketing. Simply choose the package that fits your business today and
              upgrade whenever you&apos;re ready.
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

      {/* More Ways To Be Part Of DigitalFlyer — UI/UX pass 2026-07-17: new.
          List Your Event and Become an Agent both had no real homepage
          presence before (Events only had a nav link, Agents only a
          footer link) — deliberately quieter, outline-button styling here
          so neither competes visually with the Growth-signup CTAs above,
          which stay the loud ones. One combined section, not two full
          ones, to keep the page shorter overall. */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-8">
              <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <h3 className="font-display text-xl uppercase tracking-wide text-ink">List Your Event — Free</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Running a market, workshop or community event? List it on DigitalFlyer at no cost, ever — no
                account fees, no ticketing step.
              </p>
              <Link
                href="/events/new"
                className="mt-2 w-fit rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
              >
                List Your Event
              </Link>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-8">
              <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <Users className="size-5" aria-hidden />
              </span>
              <h3 className="font-display text-xl uppercase tracking-wide text-ink">Become An Agent</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Earn recurring commission promoting DigitalFlyer to your own network — you don&apos;t need to
                be a member yourself to apply.
              </p>
              <Link
                href="/agents/apply"
                className="mt-2 w-fit rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
              >
                Apply As An Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Combined spec Sec 16: was a persuasion section (with its own
          WhatsApp/join CTAs, via EcosystemAccess) duplicating what the
          pricing cards above now say directly — this section's job is
          quick clarification now, not a second sales pitch. Deliberately
          not reusing EcosystemAccess here: that component's actionable
          CTAs are still exactly right on the dashboard (a real client
          taking a real next step), just wrong for a factual one-liner
          answering "what does this actually do?" here. */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              What you also get access to.
            </h2>
            <p className="mt-3 text-gray-600">Every tier includes all three, at no extra cost.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {ECOSYSTEM_QUICK_REFERENCE.map((item) => (
              <div key={item.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold tracking-tight text-ink">{item.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — UI/UX pass 2026-07-17: tightened from three lines of
          restated "join us" copy (echoing the hero, both banner CTAs, and
          the old "Everything/Every Business Starts" headings) to one clean
          closing line, deliberately not using "start(s)" again — that word
          was doing double, triple duty across the page's headings. Bookends
          the hero with the same brand-blue treatment. */}
      <section className="bg-brand px-6 py-16 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h2 className="font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
            This Could Be Your Business.
          </h2>
          <p className="text-lg text-white/85">
            Join today and get found by customers who are already looking.
          </p>
          <a
            href="#pricing"
            className="mt-2 inline-block rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            See Pricing
          </a>
        </div>
      </section>

      {/* Public Beta Polish Sprint Sec 5: homepage-only "Get in Touch" —
          a question about DigitalFlyer itself, not any specific client, so
          it's a distinct block from any /[slug] page's own lead form. */}
      <GetInTouchSection />

      <SiteFooter />
    </main>
  );
}
