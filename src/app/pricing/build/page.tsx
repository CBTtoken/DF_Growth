import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BuildOrderForm } from "@/components/pricing/BuildOrderForm";
import { amountForTier } from "@/lib/paystack/plans";
import {
  BUILD_ORDER_AMOUNT_CENTS,
  BUILD_ORDER_AMOUNT_LABEL,
  BUILD_ORDER_PROMISE,
  BUILD_ORDER_INCLUDED,
  BUILD_ORDER_EXCLUDED,
} from "@/lib/growth-client/build-order";

const PAGE_TITLE = "We build your page for you";
const PAGE_DESCRIPTION =
  "Send us your details and we build your whole business page for you, once-off R450 with any plan. Live within 3 working days.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pricing/build" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/pricing/build",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DigitalFlyer SA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

// Never prerendered, and never cached. This was `revalidate = 3600` and the
// production build proved why that is wrong for a checkout page: Paystack
// happened to reject one plan code during the build, the page baked its own
// error state, and it would have served that to every visitor for an hour.
// A page whose entire job is quoting a price fetches the price per request.
export const dynamic = "force-dynamic";

function rand(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

// Per plan, not per page. One unavailable plan should cost the member that
// one option, not the whole door. Returns null rather than throwing so the
// caller can decide, and never invents a number: an unpriceable option is
// simply not offered (the interface standard's "never invent data" rule
// applied to the one place it would cost real money).
async function priceOrNull(tier: "foundation" | "growth_engine", interval: "monthly" | "annual") {
  try {
    return await amountForTier(tier, interval);
  } catch (err) {
    console.error(`Could not load the ${tier} ${interval} plan price`, err);
    return null;
  }
}

function tierPrices(monthly: number | null, annual: number | null) {
  return {
    monthly: monthly === null ? null : `${rand(monthly)} a month`,
    annual: annual === null ? null : `${rand(annual)} a year`,
    totalMonthly: monthly === null ? null : rand(BUILD_ORDER_AMOUNT_CENTS + monthly),
    totalAnnual: annual === null ? null : rand(BUILD_ORDER_AMOUNT_CENTS + annual),
  };
}

export default async function BuildOrderPage() {
  const [foundationMonthly, foundationAnnual, growthMonthly, growthAnnual] = await Promise.all([
    priceOrNull("foundation", "monthly"),
    priceOrNull("foundation", "annual"),
    priceOrNull("growth_engine", "monthly"),
    priceOrNull("growth_engine", "annual"),
  ]);

  const prices = {
    foundation: tierPrices(foundationMonthly, foundationAnnual),
    growth_engine: tierPrices(growthMonthly, growthAnnual),
  };

  // Only when there is nothing at all to sell does the page give up. Showing
  // a wrong total on a checkout page is the one failure worth taking a page
  // down for; showing three of four options is not.
  const nothingAvailable =
    foundationMonthly === null && foundationAnnual === null && growthMonthly === null && growthAnnual === null;

  if (nothingAvailable) {
    return (
      <main className="flex flex-1 flex-col">
        <MarketingHeader />
        <section className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            We cannot show prices right now
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Something on our side is not responding, and we would rather show you nothing than a
            wrong number. Please try again in a few minutes, or{" "}
            <Link href="/pricing" className="font-semibold text-brand hover:underline">
              look at the plans
            </Link>{" "}
            in the meantime.
          </p>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white pt-12 pb-8 lg:pt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-ink sm:text-4xl">
            We build it for you
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-mid">
            Fill this in once, and we build your whole page: the right look for your trade, your
            photos sorted out, and your own words turned into proper copy. {BUILD_ORDER_PROMISE}
          </p>
          <p className="mt-3 text-sm text-neutral-mid">
            Would rather do it yourself?{" "}
            <Link href="/pricing" className="font-bold text-brand-blue hover:text-brand-blue-dark">
              Pick a plan and build it yourself →
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink">
              What the {BUILD_ORDER_AMOUNT_LABEL} covers
            </h2>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {BUILD_ORDER_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span aria-hidden className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-green-600 text-[9px] font-bold text-white">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink">What it does not cover</h2>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {BUILD_ORDER_EXCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span aria-hidden className="mt-1 size-4 shrink-0 rounded-full border-2 border-gray-200" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Both are things we can help with separately. Just ask once you are set up.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <BuildOrderForm prices={prices} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
