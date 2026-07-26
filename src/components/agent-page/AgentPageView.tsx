import Image from "next/image";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { AgentPortrait } from "@/components/agent-page/AgentPortrait";
import { AgentAttribution } from "@/components/agent-page/AgentAttribution";
import { AgentPageView as AgentPixelView } from "@/components/agent-page/AgentPageTracking";
import { ContactButton } from "@/components/agent-page/AgentCtas";
import { resolveAgentTheme } from "@/lib/agent-page/themes";
import { activeSinceLabel, agentContact, agentFirstName } from "@/lib/agent-page/identity";
import type { AgentPage, AgentSocialProof, ProofPage } from "@/lib/agent-page/data";

// Agent page v3, per docs/agent-page-v3-final.md.
//
// The idea in one line: an agent is not a link, an agent is the reason a
// business owner does not have to figure any of this out alone. Two things
// follow from that and they drive everything here.
//
// The page is short. Five sections. If the promise is that you do not have
// to do the work, a page that makes you read eleven sections contradicts
// itself.
//
// The page is written in the agent's voice about the reader's business.
// Not "I am someone who has done these things" but "I will sort this out
// for you". Sections 2, 3 and 4 are entirely standard copy, which is what
// lets an agent who uploads nothing still get a page that sounds like a
// person: the standard copy is already speaking as them.
//
// v1 is superseded. It was product-shaped (a promise line, a story, an
// offer paragraph, four calls to action all saying Start free) and it asked
// every agent to write three blocks of copy before their page was any good.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-agent-serif",
});

// Section 3's inset checklist. Platform copy, identical on every agent
// page, and deliberately not agent-editable: agent terms 25 and 26 forbid
// an agent inventing features or quoting their own prices for our product.
const WHAT_YOU_END_UP_WITH = [
  "Your own professional page",
  "A place on the marketplace",
  "Branded posts every month",
  "Real customer reviews",
];

const STEPS = [
  {
    title: "You message me",
    body: "We talk about what your business does and who you want reaching you. No forms, no jargon.",
  },
  {
    title: "I get it built",
    body: "Your page, your look, your words. You see it and approve it before anyone else does.",
  },
  {
    title: "You start sharing it",
    body: "One link for WhatsApp, Facebook, your invoices, the back of your bakkie.",
  },
];

export function AgentPageView({
  agent,
  socialProof,
  proofPages,
  mode,
}: {
  agent: AgentPage;
  socialProof: AgentSocialProof[];
  proofPages: ProofPage[];
  // "preview" is the admin's draft view. Identical page, but it sets no
  // attribution cookie and fires no pixel events, so previewing a draft
  // can never overwrite Dewald's own referral cookie or land in the ad
  // account's reporting as a real visit.
  mode: "live" | "preview";
}) {
  const theme = resolveAgentTheme(agent.theme);
  const firstName = agentFirstName(agent.fullName);
  const contact = agentContact(agent);
  const activeSince = activeSinceLabel(agent.activeSince);

  // v3: "No Start free anywhere on an agent page." The secondary action is
  // quiet and still carries the referral code, per build spec 1.8, as the
  // fallback for a visitor whose browser blocked the cookie.
  const pricesUrl = agent.referralCode ? `/pricing?ref=${encodeURIComponent(agent.referralCode)}` : "/pricing";

  const primaryCta =
    "inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-[0.98]";
  const secondaryCta =
    "inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]";

  return (
    <main className={`${newsreader.variable} flex flex-1 flex-col bg-white pb-20 sm:pb-0`}>
      {mode === "live" && agent.referralCode && <AgentAttribution referralCode={agent.referralCode} />}
      {mode === "live" && <AgentPixelView slug={agent.slug} />}

      {/* 1. Hero. Theme-tinted, not a full-bleed colour field: v3 puts the
          headline first and the agent second, so the chip establishes who
          is speaking and then gets out of the way. */}
      <section style={{ backgroundColor: theme.tint }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-5 py-14 sm:py-20">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
              <AgentPortrait photoUrl={agent.photoUrl} fullName={agent.fullName} theme={theme} rounded="full" size="chip" priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-neutral-ink">{agent.fullName}</span>
              <span className="text-xs text-neutral-muted">
                DigitalFlyer SA agent{agent.town ? `, ${agent.town}` : ""}
              </span>
            </div>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,8vw,3.75rem)] leading-[1.02] tracking-tight text-neutral-ink">
            You are good at what you do. Let me handle the online part.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-neutral-mid">
            Tell me about your business and I will get you a proper page, a place on the marketplace where local
            customers search, and posts ready to share every month.
          </p>

          {contact && (
            <div>
              <ContactButton
                contact={contact}
                slug={agent.slug}
                className={primaryCta}
                style={{ backgroundColor: theme.heroBg }}
              />
            </div>
          )}
        </div>
      </section>

      {/* 2. Recognition. Serif, no heading. One of only two places on the
          page where a person is speaking rather than a product. */}
      <section className="border-t" style={{ borderColor: theme.border }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-14 sm:py-20">
          <p className="font-[family-name:var(--font-agent-serif)] text-xl leading-[1.6] text-neutral-ink sm:text-2xl">
            Someone asks if you have a website and you are not sure what to say. A competitor with a worse product
            wins the job, because they had somewhere to send people. Your best post is three scrolls down by the time
            anyone new sees it.
          </p>
          <p className="text-base font-bold text-neutral-ink">That is the gap. Let us close it.</p>
        </div>
      </section>

      {/* 3. How this actually goes. */}
      <section className="border-t" style={{ borderColor: theme.border }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-14 sm:py-20">
          <div className="flex flex-col gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight text-neutral-ink sm:text-4xl">
              How this actually goes
            </h2>
            <p className="text-base text-neutral-mid">Three steps, and I am with you for all of them.</p>
          </div>

          <ol className="flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: theme.heroBg }}
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-bold text-neutral-ink">{step.title}</p>
                  <p className="text-base leading-relaxed text-neutral-mid">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* The only raised element on the page, per v3's rhythm note. */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: theme.tint }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.accentOnLight }}>
              What you end up with
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {WHAT_YOU_END_UP_WITH.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-base text-neutral-ink">
                  <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0" aria-hidden fill="none">
                    <path
                      d="M4 10.5l4 4 8-9"
                      stroke={theme.accentOnLight}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Proof. Platform proof, not agent proof: a brand new agent with
          nobody signed up still has to show the reader what they get. */}
      {proofPages.length > 0 && (
        <section className="border-t" style={{ borderColor: theme.border }}>
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-14 sm:py-20">
            <div className="flex flex-col gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight text-neutral-ink sm:text-4xl">
                Pages like the one you will get
              </h2>
              <p className="text-base text-neutral-mid">Real South African businesses, live right now.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {proofPages.map((page) => (
                <Link key={page.slug} href={`/${page.slug}`} className="group flex flex-col gap-2.5">
                  {/* Device frame. A phone-shaped bezel because that is
                      what the reader is holding when they see this. */}
                  <div
                    className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.25rem] border-4 bg-neutral-light transition group-hover:-translate-y-1"
                    style={{ borderColor: theme.heroBg }}
                  >
                    {page.screenshotUrl ? (
                      <Image
                        src={page.screenshotUrl}
                        alt={`The ${page.businessName} page`}
                        fill
                        sizes="(max-width: 640px) 90vw, 220px"
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-neutral-muted">
                        {page.businessName}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-neutral-ink group-hover:underline">
                    {page.businessName}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. The agent, and the close. */}
      <section className="border-t" style={{ borderColor: theme.border }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-14 sm:py-20">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <AgentPortrait photoUrl={agent.photoUrl} fullName={agent.fullName} theme={theme} rounded="full" size="avatar" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-neutral-ink">{agent.fullName}</span>
              {activeSince && (
                <span className="text-xs text-neutral-muted">
                  Verified DigitalFlyer SA agent, active since {activeSince}
                </span>
              )}
            </div>
          </div>

          {/* The second serif moment. A supplied bio replaces the standard
              fallback entirely; the fallback is written so that an agent
              who supplies nothing still sounds like a person. */}
          <p className="max-w-xl font-[family-name:var(--font-agent-serif)] text-lg leading-[1.6] text-neutral-ink sm:text-xl">
            {agent.bio?.trim()
              ? agent.bio.trim()
              : `I am here${agent.town ? ` in ${agent.town}` : ""}, and I would rather talk to you than have you fill in a form. Ask me anything, even if you are not ready yet.`}
          </p>

          {/* v3: pills, no prices shown. */}
          {agent.services.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-muted">
                {firstName} also does
              </p>
              <ul className="flex flex-wrap gap-2">
                {agent.services.map((service) => (
                  <li
                    key={service.name}
                    className="rounded-full border px-3.5 py-1.5 text-sm text-neutral-ink"
                    style={{ borderColor: theme.border, backgroundColor: theme.tint }}
                  >
                    {service.name}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-neutral-muted">
                These are {firstName}&apos;s own services, separate from DigitalFlyer SA.
              </p>
            </div>
          )}

          {/* One quiet line, hidden below three by the data layer. */}
          {socialProof.length > 0 && (
            <p className="text-sm text-neutral-mid">
              {firstName} has helped{" "}
              {socialProof.map((business, index) => (
                <span key={business.slug}>
                  {index > 0 && (index === socialProof.length - 1 ? " and " : ", ")}
                  <Link href={`/${business.slug}`} className="font-semibold hover:underline">
                    {business.businessName}
                  </Link>
                </span>
              ))}{" "}
              get online.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {contact && (
              <ContactButton
                contact={contact}
                slug={agent.slug}
                className={primaryCta}
                style={{ backgroundColor: theme.heroBg }}
              />
            )}
            <Link
              href={pricesUrl}
              className={`${secondaryCta} text-neutral-mid`}
              style={{ borderColor: theme.border }}
            >
              See prices
            </Link>
          </div>
        </div>
      </section>

      {/* v3 F1: no payment badge on an agent page, and no recruitment link.
          The badge was leaking onto both live agent pages: it belongs where
          a payment actually happens, and nothing on this page charges
          anyone. */}
      <SiteFooter showPaymentBadge={false} showAgentRecruitment={false} />

      {/* Sticky bar on mobile throughout, per v3. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t bg-white px-3 py-2.5 sm:hidden"
        style={{ borderColor: theme.border }}
      >
        {contact && (
          <ContactButton
            contact={contact}
            slug={agent.slug}
            className="flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white"
            style={{ backgroundColor: theme.heroBg }}
          />
        )}
        <Link
          href={pricesUrl}
          className="flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold text-neutral-mid"
          style={{ borderColor: theme.border }}
        >
          See prices
        </Link>
      </div>

      {mode === "live" && <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />}
    </main>
  );
}
