import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { listPublicPackages, stackingClaim, formatRand } from "@/lib/svc/data";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions and answers about Smart Value Club, grouped the way members actually ask them: joining, coupons, the monthly draw, referrals and your account.",
  alternates: { canonical: svcCanonical("/faq") },
};

// The FAQ, restructured 5 August around the member's journey rather than
// one long list: the same five sections as the Help Centre, so a person
// who cannot find their answer here lands in the matching guide one tap
// away. Written for a first-time phone user; every answer stays inside
// what the platform actually does.
type FaqItem = { q: string; a: string };
type FaqSection = { section: string; helpSlug: string; items: FaqItem[] };

export default async function FaqPage() {
  const joinHref = await svcPath("/join");
  const contactHref = await svcPath("/contact");
  const helpBase = await svcPath("/help");

  const packages = await listPublicPackages("svc");
  const main = packages[0] ?? null;
  const strong = stackingClaim(main) === "strong";
  const price = main ? formatRand(main.monthly_price_cents) : "the monthly fee";

  const sections: FaqSection[] = [
    {
      section: "Joining and getting started",
      helpSlug: "join",
      items: [
        {
          q: "What does it cost, and are there hidden fees?",
          a: `${price} a month. That is the whole price: no joining fee, no contract, no cancellation fee, nothing hidden.`,
        },
        {
          q: "What do I need to join?",
          a: "A South African cell number, an email address, and about three minutes on your phone. Payment happens on a secure page at the end.",
        },
        {
          q: "My code email has not arrived. Now what?",
          a: "First look in your Spam or Junk folder; that is where it hides nine times out of ten. Found it? Mark it as Not Spam so the next one lands normally. Still nothing after a few minutes? Tap Send me a fresh code on the same screen.",
        },
        {
          q: "Does the site work on my phone?",
          a: "Yes, it is built for phones first. It runs in your normal internet app, nothing to install, and uses no more data than ordinary browsing. Tip: use your browser menu's Add to Home Screen and it sits on your phone like an app.",
        },
      ],
    },
    {
      section: "Your coupons",
      helpSlug: "coupons-arrive",
      items: [
        {
          q: "When do my coupons arrive?",
          a: "On the 1st of every month, automatically, for every paid member. We email you when they are ready, and they wait under My coupons on your dashboard.",
        },
        {
          q: "Are the coupons real and usable in store?",
          a: "Yes. They are sourced through our coupon partner and redeem digitally at participating Dis-Chem, Checkers, Shoprite and Pick n Pay stores. Each coupon states its own terms.",
        },
        {
          q: "Do SVC coupons replace my Xtra Savings or Smart Shopper card?",
          a: strong
            ? "No. Use your loyalty card as normal. SVC coupons apply on top, at the same till, same trip."
            : "No. Keep using your loyalty card exactly as you do now. One thing to know: a coupon discount and a loyalty discount cannot both count on the same product, so pay for coupon items as one purchase and the rest as another. Same trip, both savings.",
        },
        {
          q: "How much will I actually save?",
          a: "That depends on which coupons you use, which is why your dashboard counts your real savings in Rand instead of promising you a number. The package values on this site are face value: what the benefits are worth on paper.",
        },
        {
          q: "Do unused coupons carry over to next month?",
          a: "No. A fresh set arrives on the 1st and the old set closes. Use them while they are fresh.",
        },
      ],
    },
    {
      section: "The monthly draw",
      helpSlug: "draw",
      items: [
        {
          q: "How do I enter the draw?",
          a: "You already have: every paid member gets free entries automatically each month. No forms, no cost. Your dashboard shows how many you hold.",
        },
        {
          q: "Can I get more entries?",
          a: "Yes, by genuinely saving: every R50 of coupon value you actually use earns another entry. Your dashboard shows exactly how far you are from the next one.",
        },
        {
          q: "How do I know the draw is fair?",
          a: "Entries freeze at a published cutoff and cannot be changed afterwards by anyone, including us. The winner is picked by seeded random selection, and every result is published with its seed and total entry count so it can be checked, not just believed.",
        },
        {
          q: "How will I know if I won?",
          a: "You get an email in the first week of the following month, and the result appears on the draw page with the winner's first name and surname initial.",
        },
      ],
    },
    {
      section: "Referrals",
      helpSlug: "referrals",
      items: [
        {
          q: "Do I need to refer people to get my benefits?",
          a: "No, never. Your coupons, magazine, education benefits and draw entries are yours from day one. Referrals are a small optional thank-you, not a requirement.",
        },
        {
          q: "What do I earn when someone joins through my link?",
          a: "A small amount every month that their membership is paid and active, for people you invited and two levels beyond, never further. Your dashboard shows the exact amounts and your balance.",
        },
        {
          q: "Is this an MLM or pyramid scheme?",
          a: "No. You pay the membership fee, you get the benefits, end of deal. No selling, no recruitment targets, no ranks, no teams, nothing to buy. The referral thank-you is capped at three levels and never affects your own benefits.",
        },
      ],
    },
    {
      section: "Your account",
      helpSlug: "account",
      items: [
        {
          q: "I forgot my password.",
          a: "On the login screen, tap Forgotten your password, type your email, and follow the link we send to choose a new one. Or skip passwords entirely: log in with your cell number and a one-time code.",
        },
        {
          q: "Can I cancel anytime?",
          a: "Yes. The cancel link is at the bottom of your dashboard. No fees, no phone calls, one question about why. Your benefits stay active until the end of the period you paid for.",
        },
        {
          q: "How do I stop the marketing emails but keep my membership?",
          a: "Send us a message on the contact page saying so and we change it the same day. Service emails, like your monthly coupons-are-ready note, keep coming because your membership needs them.",
        },
        {
          q: "I got a new cell number. What now?",
          a: "Your cell number is your membership number, so we change it for you rather than risking a mistake: send us both numbers on the contact page and we will move your membership across.",
        },
        {
          q: "Is my information safe?",
          a: "We ask only for what the membership needs, we record your consent when you join, and marketing is a separate choice you control. The detail lives in our privacy policy and POPIA notice, linked at the bottom of every page.",
        },
      ],
    },
  ];

  // FAQPage structured data from the same array the page renders, so the
  // two cannot drift apart.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.items.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      }))
    ),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="bg-svc-blue px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">Common questions</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            Grouped the way you would ask them. Every section ends with its
            full step-by-step guide, and a real person is always one tap away
            on the{" "}
            <Link href={contactHref} className="font-semibold text-white underline">
              contact page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-10">
          {sections.map((s) => (
            <div key={s.section}>
              <h2 className="font-svc-heading text-2xl font-bold">{s.section}</h2>
              <div className="mt-3 space-y-3">
                {s.items.map((f) => (
                  <div key={f.q} className="border-2 border-svc-ink/10 bg-white/50 p-5">
                    <h3 className="font-svc-heading text-base font-bold">{f.q}</h3>
                    <p className="mt-2 text-base leading-relaxed text-svc-ink/80">{f.a}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3">
                <Link
                  href={`${helpBase}/${s.helpSlug}`}
                  className="text-sm font-semibold text-svc-blue underline"
                >
                  The full step-by-step guide for this
                </Link>
              </p>
            </div>
          ))}

          <div className="border-t-2 border-svc-ink/10 pt-8 text-center">
            <p className="text-sm text-svc-ink/70">
              Every guide with pictures lives in the{" "}
              <Link href={helpBase} className="font-semibold text-svc-blue underline">
                Help Centre
              </Link>
              .
            </p>
            <div className="mt-4 flex justify-center">
              <Link href={joinHref} className={svcBtnPrimary}>
                Join Smart Value Club
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
