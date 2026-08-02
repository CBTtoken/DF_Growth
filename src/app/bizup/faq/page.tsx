import type { Metadata } from "next";
import Link from "next/link";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";
import { katisoPath } from "@/lib/bizup/product";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FAQ_GROUPS, faqGroupId } from "@/lib/bizup/faq-content";

// KatisoBiz's FAQ, built to the same shape as Growth's: a jump list at the
// top so a visitor with one question lands on it in a tap, then grouped
// accordions.
//
// It renders the same content the help page uses, imported rather than
// copied. Two pages with two copies of the same answers is how a product
// ends up telling somebody two different things, and it splits the search
// ranking between them.
//
// The division of labour between the two pages: /help teaches, this
// answers. Somebody who has never used it reads the help page start to
// finish. Somebody stuck on one thing comes here and leaves.

const PAGE_TITLE = "KatisoBiz questions and answers";
const PAGE_DESCRIPTION =
  "Every question about quoting, invoicing, getting paid, VAT, plans and your information, answered plainly.";

export const metadata: Metadata = {
  // Growth's domain is the root layout's metadataBase, so a KatisoBiz page
  // has to say otherwise or its share image is fetched from the wrong
  // product's domain.
  metadataBase: new URL("https://katisobiz.co.za"),
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "https://katisobiz.co.za/faq" },
  openGraph: {
    type: "article",
    siteName: "KatisoBiz",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "https://katisobiz.co.za/faq",
    locale: "en_ZA",
    images: [{ url: "/bizup/opengraph-image", width: 1200, height: 630, alt: "KatisoBiz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/bizup/opengraph-image"],
  },
};

export default async function KatisoBizFaqPage() {
  const [helpHref, howHref] = await Promise.all([katisoPath("/help"), katisoPath("/how-it-works")]);
  // Seventy four real questions on a public page is exactly what this
  // markup is for: Google can show the answers directly in results rather
  // than only a link to them. Growth's own FAQ does not do this yet and
  // should.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <main className="flex flex-1 flex-col bg-white">
      <BizUpHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="border-b border-neutral-border bg-brand-blue-light px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink lg:text-4xl">
            Questions and answers
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-neutral-mid">
            Everything about quoting, invoicing, getting paid and your information. If your question
            is not here,{" "}
            <a
              href="https://wa.me/27723110570"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-blue underline-offset-2 hover:underline"
            >
              WhatsApp us
            </a>{" "}
            and a person will answer.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={howHref} className="btn-accent px-5 py-2.5 text-sm">
              Step-by-Step walkthrough
            </Link>
            <Link href={helpHref} className="btn-outline px-5 py-2.5 text-sm">
              Full guide
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* The jump list. With sixteen groups on one page, scrolling past
              everything to find one answer defeats the point of the page. */}
          <div className="flex flex-wrap justify-center gap-2">
            {FAQ_GROUPS.map((group) => (
              <a
                key={group.heading}
                href={`#${faqGroupId(group.heading)}`}
                className="rounded-full border border-neutral-border px-3.5 py-1.5 text-xs font-semibold text-neutral-mid transition hover:border-brand-blue hover:text-brand-blue"
              >
                {group.heading}
              </a>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-12">
            {FAQ_GROUPS.map((group) => (
              <div key={group.heading} id={faqGroupId(group.heading)} className="scroll-mt-24">
                <h2 className="mb-4 text-xl font-extrabold tracking-tight text-neutral-ink">
                  {group.heading}
                </h2>
                <FaqAccordion items={group.items.map((item) => ({ question: item.q, answer: item.a }))} />
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-neutral-border bg-neutral-surface p-6 text-center">
            <p className="text-lg font-bold text-neutral-ink">Still stuck?</p>
            <p className="mt-1 text-neutral-mid">
              The walkthrough shows every screen with pictures, from signing up to sending your first
              quote.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={howHref} className="btn-accent-lg">
                See the walkthrough
              </Link>
              <Link href={helpHref} className="btn-outline px-6 py-3">
                Read the full guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BizUpFooter />
    </main>
  );
}
