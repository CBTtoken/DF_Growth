import type { Metadata } from "next";
import Link from "next/link";
import { loadMembersList } from "@/lib/bizup/members-list";
import { LEGAL_CANONICAL_HOST } from "@/lib/legal/company";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

// The KatisoBiz Members List.
//
// Dewald's framing, and it is the right one: "a simple listing, nothing
// else, no page no anything, so we can upsell when they start getting
// calls". Four facts and a WhatsApp button. No profile pages, no photos,
// no reviews, no ratings, no URLs of their own.
//
// That thinness is deliberate and commercial. Marketplace presence is a
// paid DigitalFlyer Growth feature, so a free KatisoBiz listing has to be
// a taste rather than a substitute, or it gives away the thing Growth
// members pay for.
//
// It also works in the other direction: a visitor who came looking for a
// plumber meets KatisoBiz, and a member who starts getting calls has a
// reason to want more.

export const metadata: Metadata = {
  title: "KatisoBiz Members List",
  description:
    "Plumbers, electricians, handymen and other trades across South Africa, all running their quotes and invoices on KatisoBiz. Find one near you and message them on WhatsApp.",
  alternates: { canonical: `${LEGAL_CANONICAL_HOST}/katisobiz-members` },
};

// Listings change when a member opts in or out, which is rare, so this can
// be cached and rebuilt periodically rather than queried on every visit.
export const revalidate = 900;

export default async function KatisoBizMembersPage() {
  const groups = await loadMembersList();
  const total = groups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-gray-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl uppercase tracking-wide text-ink">
            KatisoBiz Members List
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Tradesmen and small businesses across South Africa who run their quotes and invoices on
            KatisoBiz. Find one near you and message them straight on WhatsApp.
          </p>
          {total > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {total} {total === 1 ? "business" : "businesses"} listed.
            </p>
          )}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <p className="text-gray-600">
                Nobody is listed yet. If you use KatisoBiz, you can add yourself from your settings.
              </p>
              <Link
                href="/bizup"
                className="mt-4 inline-block rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                See KatisoBiz
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map((group) => (
                <div key={group.serviceId}>
                  <h2 className="font-display text-xl uppercase tracking-wide text-ink">
                    {group.heading}
                  </h2>
                  <div className="mt-4 flex flex-col gap-2">
                    {group.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{m.name}</span>
                          <span className="block text-sm text-gray-500">
                            {m.serviceLabel}
                            {m.town ? ` · ${m.town}` : ""}
                          </span>
                        </span>
                        {/* Routed through our own endpoint so the tap is
                            counted before the visitor is handed to
                            WhatsApp. That count is the upsell trigger: a
                            member getting calls from a free listing is the
                            easiest conversation about a Growth page there
                            is. rel=nofollow because these are outbound
                            links we do not want to pass ranking to. */}
                        <a
                          href={`/api/katisobiz-members/${m.id}/contact`}
                          rel="nofollow"
                          className="shrink-0 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                        >
                          WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Both directions of the cross-sell, kept honest: this is what the
          list is, and this is how to get on it. */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl uppercase tracking-wide text-ink">
            Run your own quotes and invoices
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Everyone on this page sends professional quotes and invoices from their phone with
            KatisoBiz. It is free to start, and a listing here comes with it.
          </p>
          <Link
            href="/bizup"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            See how KatisoBiz works
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
