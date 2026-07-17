import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

// UI/UX pass, 2026-07-17: moved off /pricing entirely — a real, full FAQ
// section was one of the longest single blocks on the homepage, and most
// visitors landing there are already past the "what is this" question a
// FAQ answers. Its own page, linked from the nav, keeps it a click away
// for anyone who wants it without making everyone else scroll past it.
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
    question: "What is a Day One Business?",
    answer:
      "The first 10 businesses to join Growth on the annual plan (R1,199/year) become Day One Businesses. You'll lock in that price for life, and once Enterprise launches, you get Enterprise access permanently, for as long as you stay on the annual plan.",
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
    answer: "Only a few minutes. Our online signup walks you through everything, step by step.",
  },
  {
    question: "Are there any hidden costs?",
    answer: "Never. Transparency is one of our core values.",
  },
  {
    question: "Why should I join now?",
    answer:
      "Only 10 Day One Business spots are available on Growth's annual plan. Joining now means you'll help shape DigitalFlyer from the beginning while locking in Day One Member benefits for life.",
  },
];

const PAGE_TITLE = "Frequently Asked Questions";
const PAGE_DESCRIPTION = "Everything you need to know about DigitalFlyer Growth before you join.";

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
            Everything you need to know before you join. Still have a question?{" "}
            <Link href="/pricing#get-in-touch" className="text-brand underline-offset-2 hover:underline">
              Get in touch
            </Link>
            .
          </p>
          <div className="mt-10">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
