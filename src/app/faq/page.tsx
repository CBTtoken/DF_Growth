import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

// UI/UX pass, 2026-07-17: expanded from 10 flat questions into a full,
// categorised help centre covering every real feature in the platform —
// Dewald's exact ask. Every answer here describes something genuinely
// built and live, not aspirational — where a feature is still "coming
// soon" (Enterprise, BizUp), the answer says so plainly rather than
// implying it already works. Grouped into categories (each its own
// FaqAccordion instance, so open/closed state doesn't leak between
// sections) with a jump-list at the top, since a single 40+ item flat
// list would defeat the "super clear, easy to follow" goal this whole
// pass has been about.
const FAQ_CATEGORIES: { id: string; title: string; items: { question: string; answer: string }[] }[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        question: "What is DigitalFlyer?",
        answer:
          "DigitalFlyer is a business platform that helps South African businesses build their online presence, get discovered by customers and grow through one connected ecosystem.",
      },
      {
        question: "Do I need a website already?",
        answer: "No. DigitalFlyer creates your professional online presence for you, from scratch, in a few minutes.",
      },
      {
        question: "Do I need to be good with computers?",
        answer:
          "No. Every step is a short, guided form with plain-language instructions, no tech skills required. If you can use WhatsApp, you can do this.",
      },
      {
        question: "How long does setup take?",
        answer:
          "About 10 minutes for most businesses. Our online signup walks you through everything, step by step. See exactly what each screen looks like on our How It Works page.",
      },
      {
        question: "Can I stop partway through and come back later?",
        answer: "Yes. Nothing is lost, you'll pick up exactly where you left off next time you log in.",
      },
    ],
  },
  {
    id: "plans-billing",
    title: "Plans & Billing",
    items: [
      {
        question: "What's the difference between Foundation and Growth?",
        answer:
          "Foundation gives you a professional business page, marketplace listing, lead generation page, and a monthly digital asset. Growth adds campaign landing pages, performance tracking, ongoing marketing assets, monthly optimisation, and growth reporting, everything you need once you're ready to actively reach more customers.",
      },
      {
        question: "Do I need a credit card to start?",
        answer: "No. Foundation is completely free for your first 7 days, no card required at signup.",
      },
      {
        question: "What happens after my Foundation trial ends?",
        answer:
          "If you haven't added payment, your page pauses until you do. Nothing is deleted, you can reactivate any time and pick up exactly where you left off.",
      },
      {
        question: "What is a Day One Business?",
        answer:
          "The first 10 businesses to join Growth on the annual plan (R1,199/year) become Day One Businesses. You'll lock in that price for life, and once Enterprise launches, you get Enterprise access permanently, for as long as you stay on the annual plan.",
      },
      {
        question: "Can I upgrade or downgrade later?",
        answer: "Yes, any time, directly from your dashboard. Nothing about your existing page is lost when you switch.",
      },
      {
        question: "Can I cancel at any time?",
        answer: "Yes. There are no long-term contracts. You can cancel whenever you choose, directly from your dashboard.",
      },
      {
        question: "Are there any hidden costs?",
        answer: "Never. Transparency is one of our core values, what you see on the pricing page is what you pay.",
      },
      {
        question: "Is Enterprise available yet?",
        answer:
          "Not yet, full Meta and Google ad management is on its way. Get in touch from the pricing page and we'll let you know the moment it's ready.",
      },
    ],
  },
  {
    id: "your-page",
    title: "Your Page & Design",
    items: [
      {
        question: "Can I choose how my page looks?",
        answer:
          "Yes. Browse real, ready-made designs, already using your own colours and logo, and pick the one you like during signup.",
      },
      {
        question: "Can I change my design later?",
        answer: "Yes, any time, at no extra cost, directly from your dashboard.",
      },
      {
        question: "Do I need my own photos?",
        answer:
          "No. Upload your own if you have them, or search thousands of free stock photos right there in the signup, either works.",
      },
      {
        question: "Do I need a logo?",
        answer: "No, it's optional. Skip it during signup and add one any time later.",
      },
      {
        question: "Can I edit my page after it's live?",
        answer: "Yes, any time, from your dashboard, there's no need to go through onboarding again.",
      },
      {
        question: "What are Packages?",
        answer:
          "An optional way to showcase set prices, service packages, or a time-limited special or discount on your page, up to three. This is a showcase, not a checkout, customers get in touch with you directly to book or buy.",
      },
    ],
  },
  {
    id: "getting-found",
    title: "Getting Found Online",
    items: [
      {
        question: "Will Google find my page?",
        answer:
          "Every DigitalFlyer page is set up the way search engines expect from the moment it goes live, the technical groundwork is already done, not something you have to figure out later.",
      },
      {
        question: "Can my reviews show up in Google search?",
        answer:
          "Your page is built to hand Google exactly what it needs to show your star rating directly in search results, once you've collected some real reviews.",
      },
      {
        question: "Do you track who visits my page?",
        answer:
          "Yes. Real visitor numbers show up right in your own dashboard, no separate analytics account to create or learn.",
      },
      {
        question: "Can I run Facebook or Instagram ads?",
        answer:
          "Yes, on Growth. Connect your Meta Pixel and Ad Account from your dashboard, and your tracking holds up against today's privacy browsers and ad blockers, not just a pixel that quietly stops reporting results.",
      },
      {
        question: "Do I need to know what a \"Pixel\" is to connect Meta ads?",
        answer:
          "No. Your dashboard explains it in plain language, and you can tick a box asking us to help set it up if you'd rather not do it yourself.",
      },
    ],
  },
  {
    id: "social-assets",
    title: "Social Media Assets",
    items: [
      {
        question: "What are \"Digital Assets\"?",
        answer:
          "Ready-made, branded images sized for Facebook and Instagram, special offers, announcements, before-and-afters, new arrivals, and customer testimonials, generated in your own colours in seconds.",
      },
      {
        question: "Do I need design skills to make one?",
        answer: "No. Pick a style, type in your text, and download, no design experience needed.",
      },
      {
        question: "How many can I make?",
        answer:
          "Foundation includes a monthly digital asset. Growth includes ongoing marketing assets as part of your plan.",
      },
    ],
  },
  {
    id: "leads-reviews",
    title: "Leads, Reviews & Testimonials",
    items: [
      {
        question: "How do customers actually contact me?",
        answer: "Through the enquiry form built into your page, every message goes straight to you.",
      },
      {
        question: "Can customers leave reviews on my page?",
        answer:
          "Yes. Reviewers verify with a one-time code, so reviews are from real people. You can reply publicly to any review, but you can't edit or remove one yourself, if a review looks fake or abusive, flag it and our team will take a look.",
      },
      {
        question: "Can I add my own testimonials?",
        answer: "Yes, directly from your dashboard, any time.",
      },
    ],
  },
  {
    id: "ecosystem",
    title: "The DigitalFlyer Ecosystem",
    items: [
      {
        question: "What's included besides my own page?",
        answer:
          "Every membership includes a DigitalFlyer Marketplace listing and RE:Biz Nomads community access, at no extra cost.",
      },
      {
        question: "What is the DigitalFlyer Marketplace?",
        answer: "A shared directory where customers can discover your business alongside other DigitalFlyer members.",
      },
      {
        question: "What is RE:Biz Nomads?",
        answer:
          "A private community of South African business owners for deals, support, and real conversations with people building the same thing you are.",
      },
      {
        question: "What is BizUp?",
        answer:
          "In-chat messaging and payments, so you can talk to and get paid by customers in one place. It's part of your membership as it rolls out, not live for every account yet.",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    items: [
      {
        question: "What is DigitalFlyer Events?",
        answer: "A free listing for markets, workshops, fundraisers, and other community events, browsable by anyone.",
      },
      {
        question: "Do I need to be a DigitalFlyer member to list an event?",
        answer: "No, listing an event is open to anyone, member or not.",
      },
      {
        question: "Is there a fee to list an event?",
        answer: "No. It's free, always, with no account fees and no ticketing step.",
      },
    ],
  },
  {
    id: "agents",
    title: "Become an Agent",
    items: [
      {
        question: "What is the Agent Referral Programme?",
        answer:
          "A way to earn recurring commission promoting DigitalFlyer Growth to your own network, you don't need to be a Growth member yourself to apply.",
      },
      {
        question: "How much commission do agents earn?",
        answer:
          "25% on your first 10 referrals, 40% from your 11th referral onward, including earlier referrals once they renew. Only Growth and Enterprise annual plans qualify, never Foundation or a monthly plan.",
      },
      {
        question: "When do agents get paid?",
        answer:
          "Once a referred member's annual payment has actually cleared, via direct bank transfer. If someone cancels before paying, nothing is owed and nothing is clawed back later.",
      },
      {
        question: "Does commission repeat every year?",
        answer: "Yes, every year a referred member renews, not just on their first payment.",
      },
    ],
  },
  {
    id: "account-support",
    title: "Account & Support",
    items: [
      {
        question: "How do I log back in?",
        answer:
          "With the email and password you set during signup. Forgot your password? Use the reset link on the login page.",
      },
      {
        question: "Can I manage more than one business with one login?",
        answer: "Yes, switch between them any time from your dashboard.",
      },
      {
        question: "Who do I contact if I need help?",
        answer: "Use the Get in Touch form on our homepage, or reply to any of our emails, we respond within one business day.",
      },
    ],
  },
];

const PAGE_TITLE = "Frequently Asked Questions";
const PAGE_DESCRIPTION = "Everything you need to know about DigitalFlyer Growth, every feature, plainly explained.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: "/faq" },
  twitter: { title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

export const revalidate = 3600;

export default function FaqPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-center text-gray-600">
            Every feature, plainly explained. Still have a question?{" "}
            <Link href="/pricing#get-in-touch" className="text-brand underline-offset-2 hover:underline">
              Get in touch
            </Link>
            .
          </p>

          {/* Jump list — once expanded to 10 categories, scrolling past
              everything to find one answer defeats the point of this
              page. A visitor scanning for "how does billing work" should
              land there in one tap, not a scroll. */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {FAQ_CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand hover:text-brand"
              >
                {cat.title}
              </a>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-12">
            {FAQ_CATEGORIES.map((cat) => (
              <div key={cat.id} id={cat.id} className="scroll-mt-20">
                <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-ink">{cat.title}</h2>
                <FaqAccordion items={cat.items} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
