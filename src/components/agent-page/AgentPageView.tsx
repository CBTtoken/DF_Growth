import Link from "next/link";
import { Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { AgentPortrait } from "@/components/agent-page/AgentPortrait";
import { AgentAttribution } from "@/components/agent-page/AgentAttribution";
import { AgentPageView as AgentPixelView } from "@/components/agent-page/AgentPageTracking";
import { WhatsAppButton } from "@/components/agent-page/AgentCtas";
import { buildAgentPalette } from "@/lib/agent-page/palette";
import { activeSinceLabel, agentWhatsAppLink, stackedName } from "@/lib/agent-page/identity";
import type { AgentPage, AgentSocialProof } from "@/lib/agent-page/data";

// Agent Programme Phase 1 Sec 1.3. A bespoke page, deliberately not a
// template: it is not registered in lib/templates/anchors.ts, it is not in
// the wizard's template picker, and it is not reusable. Same standing as
// the Buffelskop and HelpLift custom pages.
//
// The concept, per the brief: a calling card that scrolls. Business
// templates are product-first because they sell a product. An agent sells
// trust, so this is person-first: one accent colour, one face, the name at
// display size, and then the agent talking in their own voice the whole
// way down. Where the business templates go bold and busy, this goes quiet.
// Mobile is the real design; desktop is the same page with room around it.
//
// The serif is load-bearing rather than decorative. It is used in exactly
// one place, the story block, to mark the shift from the platform
// describing an offer to a person speaking. Everything else stays in the
// app's sans.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-agent-serif",
});

// Sec 1.3: "Their own services appear as a subordinate block, present but
// not competing with the DigitalFlyer offer." The DigitalFlyer half is
// platform copy, identical on every agent page, and deliberately not
// agent-editable: agent terms 9.1 and 9.2 forbid an agent inventing
// features or quoting their own prices for our product, so the safest
// place for the product claims is here, written once, in first person to
// stay in the page's voice.
const PLATFORM_POINTS = [
  "A professional page built for your business, at your own web address.",
  "A place on the DigitalFlyer SA marketplace, where local customers search.",
  "Branded social media posts made for your business every month.",
  "Real customer reviews, collected and shown on your page.",
];

function sectionLabel(text: string, colour: string) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: colour }}>
      {text}
    </p>
  );
}

export function AgentPageView({
  agent,
  socialProof,
  mode,
}: {
  agent: AgentPage;
  socialProof: AgentSocialProof[];
  // "preview" is the admin's draft view. It renders the identical page but
  // sets no attribution cookie and fires no pixel events, so previewing a
  // draft can never overwrite Dewald's own referral cookie or land in the
  // ad account's reporting as a real visit.
  mode: "live" | "preview";
}) {
  const palette = buildAgentPalette(agent.accentColor);
  const { first, rest } = stackedName(agent.fullName);
  const whatsappUrl = agentWhatsAppLink(agent.whatsappNumber);
  const activeSince = activeSinceLabel(agent.activeSince);

  // Sec 1.8: every call to action carries the referral code as a URL
  // parameter as well as relying on the cookie, so a visitor whose browser
  // blocked the cookie is still attributed.
  const signupUrl = agent.referralCode ? `/pricing?ref=${encodeURIComponent(agent.referralCode)}` : "/pricing";

  const primaryCta =
    "inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 active:scale-[0.98]";
  const secondaryCta =
    "inline-flex items-center justify-center rounded-xl border px-6 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 active:scale-[0.98]";

  return (
    <main className={`${newsreader.variable} flex flex-1 flex-col bg-white pb-20 sm:pb-0`}>
      {mode === "live" && agent.referralCode && <AgentAttribution referralCode={agent.referralCode} />}
      {mode === "live" && <AgentPixelView slug={agent.slug} />}

      {/* Hero. Flat field, no gradient mesh, no floating cards. The only
          things in it are the face, the name, and one sentence. */}
      <section style={{ backgroundColor: palette.heroBg }} className="text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-9 px-5 py-14 sm:py-20 md:flex-row md:items-end md:gap-14">
          <div className="w-full max-w-[19rem] self-center md:max-w-[21rem] md:self-end">
            <AgentPortrait photoUrl={agent.photoUrl} fullName={agent.fullName} palette={palette} priority />
          </div>

          <div className="flex flex-col gap-5 md:flex-1 md:pb-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-white/60">
              DigitalFlyer SA Agent
            </p>

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(3rem,13vw,5.75rem)] uppercase leading-[0.86] tracking-tight">
              <span className="block">{first}</span>
              {rest && <span className="block text-white/85">{rest}</span>}
            </h1>

            {agent.town && (
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/65">{agent.town}</p>
            )}

            {agent.heroPromise && (
              <p className="max-w-md text-lg leading-relaxed text-white/90 sm:text-xl">{agent.heroPromise}</p>
            )}

            <div className="mt-1 flex flex-wrap gap-3">
              <a href={signupUrl} className={primaryCta} style={{ backgroundColor: "#ffffff", color: palette.heroBg }}>
                Start free
              </a>
              {whatsappUrl && (
                <WhatsAppButton
                  whatsappUrl={whatsappUrl}
                  slug={agent.slug}
                  className={`${secondaryCta} border-white/35 text-white hover:border-white/70`}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sec 1.3: thin credential strip. Three plain facts, nothing
          claimed that isn't in the database. */}
      <div style={{ backgroundColor: palette.tint, borderColor: palette.border }} className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-mid">
          <span style={{ color: palette.accentOnLight }}>Verified agent</span>
          {activeSince && (
            <>
              <span aria-hidden className="text-neutral-muted/50">
                ·
              </span>
              <span>Active since {activeSince}</span>
            </>
          )}
          {agent.town && (
            <>
              <span aria-hidden className="text-neutral-muted/50">
                ·
              </span>
              <span>{agent.town}</span>
            </>
          )}
        </div>
      </div>

      {/* The story. The one serif block on the page. */}
      {agent.storyText && (
        <section className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
          <div className="flex max-w-2xl flex-col gap-6">
            {sectionLabel("My story", palette.accentOnLight)}
            <div className="flex flex-col gap-5 font-[family-name:var(--font-agent-serif)] text-xl leading-[1.65] text-neutral-ink sm:text-[1.4rem]">
              {agent.storyText.split(/\n{1,}/).map((paragraph, i) =>
                paragraph.trim() ? <p key={i}>{paragraph.trim()}</p> : null
              )}
            </div>
          </div>
        </section>
      )}

      {/* What the agent can do for a business. The DigitalFlyer offer,
          which is the reason the page exists. */}
      <section style={{ backgroundColor: palette.tint }}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-14 sm:py-20">
          <div className="flex max-w-2xl flex-col gap-5">
            {sectionLabel("What I do for your business", palette.accentOnLight)}
            {agent.offerText && (
              <p className="text-lg leading-relaxed text-neutral-mid sm:text-xl">{agent.offerText}</p>
            )}
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {PLATFORM_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm leading-relaxed text-neutral-ink"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span
                  aria-hidden
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: palette.accentOnLight }}
                />
                {point}
              </li>
            ))}
          </ul>

          <div>
            <a href={signupUrl} className={primaryCta} style={{ backgroundColor: palette.heroBg, color: "#ffffff" }}>
              Start free
            </a>
          </div>
        </div>
      </section>

      {/* Sec 1.3: the agent's own services, subordinate. Smaller type, no
          accent field, no call to action of its own, so it reads as "I
          also do this" rather than competing with the block above. */}
      {agent.services.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
          <div className="flex flex-col gap-6">
            {sectionLabel("My own services", palette.accentOnLight)}
            <div className="grid gap-4 sm:grid-cols-3">
              {agent.services.map((service) => (
                <div
                  key={service.name}
                  className="flex flex-col gap-1.5 rounded-xl border p-4"
                  style={{ borderColor: palette.border }}
                >
                  <h3 className="text-sm font-bold text-neutral-ink">{service.name}</h3>
                  {service.price && (
                    <p className="text-sm font-semibold" style={{ color: palette.accentOnLight }}>
                      {service.price}
                    </p>
                  )}
                  {service.description && (
                    <p className="text-sm leading-relaxed text-neutral-mid">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-muted">
              These are my own services, separate from DigitalFlyer SA.
            </p>
          </div>
        </section>
      )}

      {/* Sec 1.3: hidden entirely below three, and the data layer is what
          enforces that (getAgentSocialProof returns an empty array), so
          there is no path where a thin version of this renders. No counts,
          no figures, just the businesses themselves. */}
      {socialProof.length > 0 && (
        <section style={{ backgroundColor: palette.tint }}>
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-14 sm:py-20">
            {sectionLabel("Businesses I brought on", palette.accentOnLight)}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {socialProof.map((business) => (
                <Link
                  key={business.slug}
                  href={`/${business.slug}`}
                  className="flex flex-col gap-1 rounded-xl bg-white p-4 transition hover:-translate-y-0.5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <span className="text-sm font-bold text-neutral-ink">{business.businessName}</span>
                  <span className="text-xs text-neutral-muted">
                    {[business.industry, business.city].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing. Same two actions, nothing new introduced. */}
      <section style={{ backgroundColor: palette.heroBg }} className="text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-14 sm:py-20">
          <h2 className="font-[family-name:var(--font-display)] text-4xl uppercase leading-none tracking-tight sm:text-5xl">
            Let us get your business found
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-white/85">
            Start free and see your own page before you pay for anything. If you would rather talk it through first,
            message me.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={signupUrl} className={primaryCta} style={{ backgroundColor: "#ffffff", color: palette.heroBg }}>
              Start free
            </a>
            {whatsappUrl && (
              <WhatsAppButton
                whatsappUrl={whatsappUrl}
                slug={agent.slug}
                className={`${secondaryCta} border-white/35 text-white hover:border-white/70`}
              />
            )}
          </div>
        </div>
      </section>

      {/* Sec 1.3: "No recruitment call to action anywhere on an agent
          page." The shared footer carries a "Become an Agent" link, which
          is exactly that, so it is switched off here. */}
      <SiteFooter showAgentRecruitment={false} />

      {/* Sec 1.3: sticky bottom bar on mobile, two actions. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t px-3 py-2.5 sm:hidden"
        style={{ backgroundColor: palette.heroBg, borderColor: "rgba(255,255,255,0.15)" }}
      >
        <a
          href={signupUrl}
          className="flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold"
          style={{ backgroundColor: "#ffffff", color: palette.heroBg }}
        >
          Start free
        </a>
        {whatsappUrl && (
          <WhatsAppButton
            whatsappUrl={whatsappUrl}
            slug={agent.slug}
            className="flex flex-1 items-center justify-center rounded-lg border border-white/40 px-4 py-3 text-sm font-bold text-white"
          />
        )}
      </div>

      {mode === "live" && <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />}
    </main>
  );
}
