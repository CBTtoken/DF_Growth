import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { listPublicPackages, stackingClaim } from "@/lib/svc/data";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions and answers about Smart Value Club membership: coupons, the monthly draw, referrals, cancelling, and how your savings are counted.",
  alternates: { canonical: svcCanonical("/faq") },
};

// The FAQ from the current site, kept where it was honest and rewritten
// where it was not (handoff section 12: "coupons verified with the
// retailers" is replaced with what actually happens).
const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need to refer people to get my coupons?",
    a: "No. Your coupons, magazine, education benefits and draw entries are yours from day one. Referrals are optional and completely separate.",
  },
  {
    q: "Are the coupons real and usable in store?",
    a: "Yes. Coupons are sourced through our coupon partner and redeem digitally at participating Dis-Chem, Checkers, Shoprite and Pick n Pay stores. Each coupon states its own terms and where it can be used. They refresh on the 1st of every month.",
  },
  {
    q: "When do my coupons arrive?",
    a: "On the 1st of every month for all active members. You will get an email when they are ready, and they appear in your member dashboard.",
  },
  {
    q: "How much will I actually save?",
    a: "That depends on which coupons you use. The package values on this site are face value, what the benefits are worth on paper. Your dashboard counts the Rand value of what you actually redeemed, so your real number is always visible to you and never invented by us.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in periods, no cancellation fees. Cancel from your dashboard and your benefits stay active until the end of the period you have paid for.",
  },
  {
    q: "Is this an MLM or pyramid scheme?",
    a: "No. You pay the membership fee, you get the benefits. No selling, no recruitment requirements, no ranks and no teams. The optional referral thank-you is capped at three levels and never affects your own benefits.",
  },
  {
    q: "What is the monthly draw?",
    a: "Every active member gets five automatic entries into the monthly members draw, and you can earn extra entries through the value you actually redeem. Entries freeze at a published cutoff, the winner is chosen by a seeded random draw, and each result is published with the total entry count.",
  },
  {
    q: "How do I log in?",
    a: "With your email and password, or with your cell number and a one-time code. Your cell number is your membership number, verified when you join.",
  },
  {
    q: "Is my information safe?",
    a: "We ask only for what the membership needs, we record your consent when you join, and marketing is a separate opt-in you control. The full detail is in our privacy policy and POPIA notice.",
  },
];

export default async function FaqPage() {
  const joinHref = await svcPath("/join");
  const contactHref = await svcPath("/contact");

  // The stacking question (handoff 12.1). The flat "coupons apply on top"
  // answer is gated on written per-retailer confirmation; until then the
  // soft form renders, from the same flag the homepage reads.
  const packages = await listPublicPackages("svc");
  const strong = stackingClaim(packages[0] ?? null) === "strong";
  const faqs: { q: string; a: string }[] = [
    FAQS[0],
    {
      q: "Do SVC coupons replace my Xtra Savings or Smart Shopper card?",
      a: strong
        ? "No. Use your loyalty card as normal. SVC coupons apply on top, at the same till, same trip."
        : "No. Keep using your loyalty card exactly as you do now. SVC coupons are separate and designed to work alongside it, and we confirm the exact till behaviour with each retailer as we roll out.",
    },
    ...FAQS.slice(1),
  ];

  // FAQPage structured data, so a search result can show the questions
  // directly. Plain strings only, built from the same array the page
  // renders, which keeps the two from drifting apart.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
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
            Straight answers. If yours is not here,{" "}
            <Link href={contactHref} className="font-semibold text-white underline">
              ask us directly
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {faqs.map((f) => (
            <div key={f.q} className="border-2 border-svc-ink/10 bg-white/50 p-6">
              <h2 className="font-svc-heading text-lg font-bold">{f.q}</h2>
              <p className="mt-2 text-base leading-relaxed text-svc-ink/80">{f.a}</p>
            </div>
          ))}
          <div className="pt-4 text-center">
            <Link href={joinHref} className={svcBtnPrimary}>
              Join Smart Value Club
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
