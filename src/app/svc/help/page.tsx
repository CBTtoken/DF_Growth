import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { HELP_GUIDES, HELP_CATEGORIES } from "@/lib/svc/help-content";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Step-by-step help for Smart Value Club: joining, claiming and using your coupons, the monthly draw, referrals and managing your account.",
  alternates: { canonical: svcCanonical("/help") },
};

// The Help Centre hub: guides grouped by category, the FAQ beside them,
// and a human at the end of the contact page. Getting help must be easier
// than getting stuck.
export default async function HelpPage() {
  const helpBase = await svcPath("/help");
  const faqHref = await svcPath("/faq");
  const contactHref = await svcPath("/contact");

  return (
    <div>
      <section className="bg-svc-blue px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">Help Centre</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            Short, honest, step-by-step guides for everything the club does.
            If a guide does not answer it, a real person will.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          {HELP_CATEGORIES.map((category) => {
            const guides = HELP_GUIDES.filter((g) => g.category === category);
            if (guides.length === 0) return null;
            return (
              <div key={category} className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-svc-ink/50">
                  {category}
                </h2>
                <div className="mt-2 space-y-2">
                  {guides.map((g) => (
                    <Link
                      key={g.slug}
                      href={`${helpBase}/${g.slug}`}
                      className="block border-2 border-svc-ink/15 bg-white/60 p-5 hover:border-svc-green"
                    >
                      <h3 className="font-svc-heading text-lg font-bold">{g.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-svc-ink/70">{g.summary}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link
              href={faqHref}
              className="flex min-h-16 items-center justify-center border-2 border-svc-green bg-white/60 px-5 text-base font-semibold text-svc-green hover:bg-svc-green hover:text-white"
            >
              Quick answers: the FAQ
            </Link>
            <Link
              href={contactHref}
              className="flex min-h-16 items-center justify-center bg-svc-green px-5 text-base font-semibold text-white hover:bg-svc-ink"
            >
              Still stuck? Talk to a person
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
