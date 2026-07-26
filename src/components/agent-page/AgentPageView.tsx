import Image from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import {
  MapPin,
  BadgeCheck,
  MessageCircle,
  HelpCircle,
  Share2,
  FileText,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Tag,
} from "lucide-react";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { AgentPortrait } from "@/components/agent-page/AgentPortrait";
import { AgentAttribution } from "@/components/agent-page/AgentAttribution";
import { AgentPageView as AgentPixelView } from "@/components/agent-page/AgentPageTracking";
import { ContactButton } from "@/components/agent-page/AgentCtas";
import { AgentStickyCta } from "@/components/agent-page/AgentStickyCta";
import { buildAgentAccent, SAND, INK } from "@/lib/agent-page/themes";
import { activeSinceLabel, agentContact, agentFirstName } from "@/lib/agent-page/identity";
import type { AgentPage, AgentSocialProof, ProofPage } from "@/lib/agent-page/data";

// The agent page, ported from the Bolt design Dewald supplied
// (docs/project-bolt-sb1-skmsgszg.zip).
//
// Warm sand ground, one agent-chosen accent ramp, Fraunces for every
// heading and the body copy in the app's own sans. The agent's name is the
// largest thing in the hero and their photo is a full 4:5 frame beside it,
// which is the change that matters most: the previous version had shrunk it
// to a 44px chip, and this design is built around the person being visible.
//
// Everything the content model already carried maps straight across, so
// this is a design port, not a content rewrite: same five ideas (who I am,
// the gap, the three steps, what you end up with plus proof, the bio and
// close), same standard copy in the agent's voice, same rule that an agent
// who uploads nothing still gets a complete page.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-agent-display",
});

const STEPS = [
  {
    n: "1",
    title: "You message me",
    body: "We talk about what your business does and who you want reaching you. No forms, no jargon, just a conversation.",
    Icon: MessageCircle,
  },
  {
    n: "2",
    title: "I help you with the info",
    body: "I ask the right questions and help you put your words and details together. The system then builds your page automatically.",
    Icon: HelpCircle,
  },
  {
    n: "3",
    title: "You approve and share it",
    body: "You see your page and approve it before anyone else does. One link for WhatsApp, Facebook, invoices, the back of your bakkie.",
    Icon: Share2,
  },
];

// Platform copy, identical on every agent page, and deliberately not
// agent-editable: agent terms 25 and 26 forbid an agent inventing features
// or quoting their own prices for our product.
const OUTCOMES = [
  { title: "Your own professional page", Icon: FileText },
  { title: "A place on the marketplace", Icon: MapPin },
  { title: "Branded posts every month", Icon: Share2 },
  { title: "Real customer reviews", Icon: Star },
];

const FOOTER_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Shop", href: "/shop" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

function SectionLabel({ children, colour }: { children: React.ReactNode; colour: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]"
      style={{ color: colour }}
    >
      <span aria-hidden className="h-px w-6" style={{ backgroundColor: colour }} />
      {children}
    </span>
  );
}

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
  // attribution cookie and fires no pixel events, so previewing a draft can
  // never overwrite Dewald's own referral cookie or land in the ad
  // account's reporting as a real visit.
  mode: "live" | "preview";
}) {
  const accent = buildAgentAccent(agent.accentColor);
  const firstName = agentFirstName(agent.fullName);
  const contact = agentContact(agent);
  const activeSince = activeSinceLabel(agent.activeSince);

  // No "Start free" anywhere on an agent page. The secondary action is
  // quiet and still carries the referral code, per build spec 1.8, as the
  // fallback for a visitor whose browser blocked the cookie.
  const pricesUrl = agent.referralCode ? `/pricing?ref=${encodeURIComponent(agent.referralCode)}` : "/pricing";

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-[0_1px_2px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.06)] transition hover:shadow-[0_2px_4px_rgba(26,23,20,0.06),0_18px_40px_rgba(26,23,20,0.12)] active:scale-[0.98]";
  const secondaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full border bg-white/70 px-6 py-3 text-base font-semibold backdrop-blur transition hover:bg-white active:scale-[0.98]";

  return (
    <div className={`${fraunces.variable} flex flex-1 flex-col`} style={{ backgroundColor: SAND[50], color: INK }}>
      {mode === "live" && agent.referralCode && <AgentAttribution referralCode={agent.referralCode} />}
      {mode === "live" && <AgentPixelView slug={agent.slug} />}

      {/* Hero */}
      <header className="relative overflow-hidden" style={{ backgroundColor: SAND[50] }}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
            style={{ backgroundColor: `${accent[200]}66` }}
          />
          <div
            className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full blur-3xl"
            style={{ backgroundColor: `${SAND[300]}80` }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-12 sm:pb-16 sm:pt-16">
          <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium"
                style={{ color: accent[700] }}
              >
                <MapPin className="h-4 w-4" aria-hidden />
                {agent.town && <span>{agent.town}</span>}
                {agent.town && (
                  <span aria-hidden style={{ color: accent[300] }}>
                    &bull;
                  </span>
                )}
                <BadgeCheck className="h-4 w-4" aria-hidden />
                <span>Verified DigitalFlyer SA agent</span>
              </div>

              <h1 className="mt-5 font-[family-name:var(--font-agent-display)] text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
                {agent.fullName}
              </h1>

              <p className="mt-2 text-lg font-medium" style={{ color: accent[700] }}>
                DigitalFlyer SA agent
              </p>

              <p className="mt-5 max-w-xl text-xl leading-snug sm:text-2xl" style={{ color: `${INK}d9` }}>
                You are good at what you do. Let me handle the online part.
              </p>

              <p className="mt-4 max-w-lg text-base leading-relaxed" style={{ color: `${INK}b3` }}>
                Tell me about your business and I will help you get the words and details right. The system builds your
                page, puts you on the marketplace, and gets your posts ready to share every month.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {contact && (
                  <ContactButton
                    contact={contact}
                    slug={agent.slug}
                    className={primaryBtn}
                    style={{ backgroundColor: accent[600] }}
                  />
                )}
                <Link href={pricesUrl} className={secondaryBtn} style={{ borderColor: `${accent[700]}4d`, color: accent[800] }}>
                  <Tag className="h-5 w-5" aria-hidden />
                  <span>See prices</span>
                </Link>
              </div>
            </div>

            <AgentPortrait
              photoUrl={agent.photoUrl}
              fullName={agent.fullName}
              accent={accent}
              activeSince={activeSince}
            />
          </div>
        </div>
      </header>

      <main>
        {/* The gap, then the three steps */}
        <section className="py-14 sm:py-16" style={{ backgroundColor: SAND[100] }}>
          <div className="mx-auto max-w-5xl px-6">
            <ScrollReveal>
              <div className="max-w-2xl">
                <SectionLabel colour={accent[700]}>The gap</SectionLabel>
                <p className="mt-4 font-[family-name:var(--font-agent-display)] text-2xl leading-snug sm:text-[1.75rem]">
                  Someone asks if you have a website and you are not sure what to say. A competitor with a worse
                  product wins the job, because they had somewhere to send people.
                </p>
                <p
                  className="mt-4 font-[family-name:var(--font-agent-display)] text-xl font-medium sm:text-2xl"
                  style={{ color: accent[800] }}
                >
                  That is the gap. Let us close it.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="mt-10">
                <SectionLabel colour={accent[700]}>How this actually goes</SectionLabel>
                <h2 className="mt-3 font-[family-name:var(--font-agent-display)] text-2xl font-semibold sm:text-3xl">
                  Three steps, and I am with you for all of them.
                </h2>
              </div>
            </ScrollReveal>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step) => (
                <ScrollReveal key={step.n}>
                  <div
                    className="h-full rounded-2xl border bg-white/70 p-6 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.06)] transition hover:-translate-y-1"
                    style={{ borderColor: SAND[200] }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full font-[family-name:var(--font-agent-display)] text-base font-semibold text-white"
                        style={{ backgroundColor: accent[600] }}
                      >
                        {step.n}
                      </span>
                      <step.Icon className="h-5 w-5" style={{ color: accent[700] }} aria-hidden />
                    </div>
                    <h3 className="mt-4 font-[family-name:var(--font-agent-display)] text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed" style={{ color: `${INK}b3` }}>
                      {step.body}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {contact && (
              <div className="mt-8 text-center">
                <ContactButton
                  contact={contact}
                  slug={agent.slug}
                  className={primaryBtn}
                  style={{ backgroundColor: accent[600] }}
                />
              </div>
            )}
          </div>
        </section>

        {/* What you end up with, then the proof, on one dark field */}
        <section className="py-14 text-white sm:py-16" style={{ backgroundColor: accent[950] }}>
          <div className="mx-auto max-w-5xl px-6">
            <ScrollReveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent[300] }}>
                  <span aria-hidden className="h-px w-6" style={{ backgroundColor: accent[300] }} />
                  What you end up with
                </span>
                <h2 className="mt-3 font-[family-name:var(--font-agent-display)] text-2xl font-semibold sm:text-3xl">
                  Everything you need to look like the real deal.
                </h2>
              </div>
            </ScrollReveal>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {OUTCOMES.map((outcome) => (
                <ScrollReveal key={outcome.title}>
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${accent[500]}33`, color: accent[200] }}
                    >
                      <outcome.Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-[family-name:var(--font-agent-display)] text-lg font-medium">
                      {outcome.title}
                    </span>
                    <CheckCircle2 className="ml-auto h-5 w-5" style={{ color: accent[300] }} aria-hidden />
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {proofPages.length > 0 && (
              <>
                <ScrollReveal>
                  <div className="mt-12 text-center">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent[300] }}>
                      <span aria-hidden className="h-px w-6" style={{ backgroundColor: accent[300] }} />
                      Pages like the one you will get
                    </span>
                    <h2 className="mt-3 font-[family-name:var(--font-agent-display)] text-2xl font-semibold sm:text-3xl">
                      Real South African businesses, live right now.
                    </h2>
                  </div>
                </ScrollReveal>

                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  {proofPages.map((page) => (
                    <ScrollReveal key={page.slug}>
                      <Link
                        href={`/${page.slug}`}
                        className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/10"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {page.screenshotUrl ? (
                            <Image
                              src={page.screenshotUrl}
                              alt={`The ${page.businessName} page`}
                              fill
                              sizes="(max-width: 640px) 90vw, 300px"
                              className="object-cover object-top transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-3 text-center text-xs text-white/60">
                              {page.businessName}
                            </div>
                          )}
                          <div
                            aria-hidden
                            className="absolute inset-0"
                            style={{ background: `linear-gradient(to top, ${accent[950]}99, transparent)` }}
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5">
                          <span className="font-[family-name:var(--font-agent-display)] text-base font-semibold">
                            {page.businessName}
                          </span>
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            style={{ color: accent[300] }}
                            aria-hidden
                          />
                        </div>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* The agent, and the close */}
        <section className="py-14 sm:py-16" style={{ backgroundColor: SAND[50] }}>
          <div className="mx-auto max-w-3xl px-6">
            <ScrollReveal>
              <div
                className="rounded-3xl border bg-white/80 p-7 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.06)] sm:p-10"
                style={{ borderColor: SAND[200] }}
              >
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-6 w-6" style={{ color: accent[700] }} aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent[700] }}>
                    Verified DigitalFlyer SA agent
                  </span>
                </div>

                {/* A supplied bio replaces the standard fallback entirely.
                    The fallback is written so an agent who supplies nothing
                    still sounds like a person. */}
                <p className="mt-5 text-lg leading-relaxed" style={{ color: `${INK}d9` }}>
                  {agent.bio?.trim()
                    ? agent.bio.trim()
                    : `I am here${agent.town ? ` in ${agent.town}` : ""}, and I would rather talk to you than have you fill in a form. Ask me anything, even if you are not ready yet.`}
                </p>

                {agent.services.length > 0 && (
                  <div className="mt-7 border-t pt-5" style={{ borderColor: SAND[200] }}>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4" style={{ color: accent[700] }} aria-hidden />
                      {firstName} also does
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      {agent.services.map((service) => (
                        <li key={service.name} className="flex items-center gap-2 text-[0.95rem]" style={{ color: `${INK}bf` }}>
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent[500] }} />
                          {service.name}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm" style={{ color: `${INK}80` }}>
                      These are {firstName}&apos;s own services, separate from DigitalFlyer SA.
                    </p>
                  </div>
                )}

                {/* One quiet line, hidden below three by the data layer. */}
                {socialProof.length > 0 && (
                  <p className="mt-5 text-sm" style={{ color: `${INK}b3` }}>
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

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {contact && (
                    <ContactButton
                      contact={contact}
                      slug={agent.slug}
                      className={primaryBtn}
                      style={{ backgroundColor: accent[600] }}
                    />
                  )}
                  <Link href={pricesUrl} className={secondaryBtn} style={{ borderColor: `${accent[700]}4d`, color: accent[800] }}>
                    <Tag className="h-5 w-5" aria-hidden />
                    <span>See prices</span>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* The design's own footer, in place of SiteFooter. It carries no
          payment badge and no "Become an Agent" link, which are the two
          things that must never appear on an agent page, so those rules are
          now structural rather than a prop someone can forget to pass. */}
      <footer className="py-10 text-white/70" style={{ backgroundColor: accent[950] }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="hidden gap-3 sm:flex">
              {contact && (
                <ContactButton
                  contact={contact}
                  slug={agent.slug}
                  label={contact.kind === "whatsapp" ? "WhatsApp" : "Email"}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
                  style={{ backgroundColor: accent[600] }}
                />
              )}
              <Link
                href={pricesUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/50"
              >
                See prices
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} {agent.fullName} &middot; DigitalFlyer SA
          </p>
        </div>
      </footer>

      <AgentStickyCta contact={contact} slug={agent.slug} pricesUrl={pricesUrl} accent600={accent[600]} />

      {mode === "live" && <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />}
    </div>
  );
}
