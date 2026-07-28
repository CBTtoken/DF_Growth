import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { loadMembersList } from "@/lib/bizup/members-list";
import { LEGAL_CANONICAL_HOST } from "@/lib/legal/company";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

// The KatisoBiz Members List.
//
// Dewald's framing, and it is the right one: "a simple listing, nothing
// else, no page no anything, so we can upsell when they start getting
// calls". Four facts and a WhatsApp button per business. No profile pages,
// no photos, no reviews, no ratings.
//
// That thinness is deliberate and commercial. Marketplace presence is a
// paid DigitalFlyer Growth feature, so a free KatisoBiz listing has to be
// a taste rather than a substitute, or it gives away the thing Growth
// members pay for. The one exception is the link to a member's Growth page
// where they have one, which is the upsell shown rather than argued: a
// member browsing this list can see that some entries carry a full page
// and theirs does not.

export const metadata: Metadata = {
  title: "Find a trade near you | KatisoBiz Members List",
  description:
    "Plumbers, electricians, handymen and other trades across South Africa, all running their quotes and invoices on KatisoBiz. Find one near you and message them on WhatsApp.",
  alternates: { canonical: `${LEGAL_CANONICAL_HOST}/katisobiz-members` },
  openGraph: {
    type: "website",
    title: "Find a trade near you",
    description:
      "Plumbers, electricians, handymen and other trades across South Africa. Message them straight on WhatsApp.",
    url: `${LEGAL_CANONICAL_HOST}/katisobiz-members`,
    locale: "en_ZA",
    // Overriding this block replaces the root layout's, images included.
    images: [{ url: "/brand/logo-blue.png", width: 1200, height: 630, alt: "DigitalFlyer SA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find a trade near you",
    description:
      "Plumbers, electricians, handymen and other trades across South Africa. Message them straight on WhatsApp.",
    images: ["/brand/logo-blue.png"],
  },
};

export const revalidate = 900;

export default async function KatisoBizMembersPage() {
  const groups = await loadMembersList();
  const total = groups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />

      {/* Off-black rather than the brand blue.

          The first version put the logo on a blue gradient and forced it
          white with a brightness filter, which flattened a two-colour mark
          into a silhouette and lost the tagline entirely. Dewald supplied
          a proper dark-background version of the logo, whose tagline is
          set in white, so it can now be used as drawn: blue and orange
          letterforms against near-black, which is what the mark was made
          for. No filter, no silhouette. */}
      <section className="border-b border-neutral-border bg-[#111418] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Image
            src="/bizup/logo-on-dark.png"
            alt="KatisoBiz"
            width={560}
            height={128}
            priority
            className="h-12 w-auto sm:h-14"
          />
          <h1 className="mt-7 text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">
            Find a trade near you
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/70">
            Every business here runs their quotes and invoices on KatisoBiz, so you get a proper
            written quote rather than a number over the phone. Message them straight on WhatsApp.
          </p>
          {total > 0 && (
            <p className="mt-5 inline-block rounded-full bg-[#e8821a] px-4 py-1.5 text-sm font-bold text-white">
              {total} {total === 1 ? "business" : "businesses"} listed
            </p>
          )}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-neutral-border bg-neutral-surface p-8 text-center">
              <p className="text-lg font-semibold text-neutral-ink">Nobody is listed yet.</p>
              <p className="mx-auto mt-2 max-w-md text-neutral-mid">
                This list fills up as KatisoBiz members choose to appear on it. If you run a
                business, you can be the first.
              </p>
              <Link href="/bizup" className="mt-5 inline-block btn-accent-lg">
                List my business free
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map((group) => (
                <div key={group.serviceId}>
                  <h2 className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-neutral-ink">
                    <span aria-hidden className="h-6 w-1.5 rounded-full bg-[#e8821a]" />
                    {group.heading}
                  </h2>

                  <div className="mt-4 flex flex-col gap-2">
                    {group.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-border bg-white p-4 shadow-card transition hover:border-[#1081b8]"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-neutral-ink">{m.name}</span>
                          <span className="block text-sm text-neutral-mid">
                            {m.serviceLabel}
                            {m.town ? ` · ${m.town}` : ""}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-2">
                          {/* Only for members who have paid for a Growth
                              page. It makes the entry more useful to a
                              customer, who can see photos and reviews
                              before phoning a stranger, and it shows every
                              other member exactly what they are missing. */}
                          {m.growthPageSlug && (
                            <Link
                              href={`/${m.growthPageSlug}`}
                              className="rounded-full border border-[#1081b8] px-4 py-2 text-sm font-semibold text-[#1081b8] transition hover:bg-[#1081b8] hover:text-white"
                            >
                              See their page
                            </Link>
                          )}
                          {/* Routed through our own endpoint so the tap is
                              counted before the visitor is handed to
                              WhatsApp, and so members' numbers never appear
                              in the page source. */}
                          <a
                            href={`/api/katisobiz-members/${m.id}/contact`}
                            rel="nofollow"
                            className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                          >
                            WhatsApp
                          </a>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Two calls to action, for the two different people who reach this
          page: a business that is not on it, and a member who is on it but
          has no page of their own. */}
      {groups.length > 0 && (
        <section className="border-t border-neutral-border bg-neutral-surface px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-neutral-border bg-white p-6">
              <h2 className="text-lg font-extrabold tracking-tight text-neutral-ink">
                Run a business? Get listed free.
              </h2>
              <p className="mt-2 flex-1 text-neutral-mid">
                Send professional quotes and invoices from your phone with KatisoBiz, and your spot
                here comes with it. Free to start, no card needed.
              </p>
              <Link href="/bizup" className="mt-4 btn-accent self-start">
                See how KatisoBiz works
              </Link>
            </div>

            <div className="flex flex-col rounded-2xl border border-neutral-border bg-white p-6">
              <h2 className="text-lg font-extrabold tracking-tight text-neutral-ink">
                Want a full page instead of a line?
              </h2>
              <p className="mt-2 flex-1 text-neutral-mid">
                DigitalFlyer Growth gives your business its own page with photos, reviews, your
                services and your own web address, and puts you on the marketplace.
              </p>
              <Link href="/pricing" className="mt-4 btn-outline self-start px-5 py-2.5">
                See DigitalFlyer Growth
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
