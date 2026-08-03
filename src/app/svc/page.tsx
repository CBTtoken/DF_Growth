import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { listPublicPackages, formatRand, stackingClaim } from "@/lib/svc/data";
import { svcBtnPrimary, svcBtnGreen, svcBtnOutlineOnDark } from "@/components/svc/ui";

export const metadata: Metadata = {
  alternates: { canonical: svcCanonical("/") },
};

// The homepage follows the current site's narrative because it is sound
// (handoff Sprint 1): the promise, the value breakdown, three steps, what
// is included, the draw, the honesty section, FAQ, closing action. Every
// claim is rewritten against section 12: face value stated as face value
// and derived from the database, no "verified" language the ledger cannot
// evidence yet, no testimonials, no member counts.
export default async function SvcHomePage() {
  const packages = await listPublicPackages("svc");
  const main = packages[0] ?? null;
  const monthly = main ? formatRand(main.monthly_price_cents) : null;
  const faceValue = main && main.faceValueCents > 0 ? formatRand(main.faceValueCents) : null;

  // Handoff 12.1: stacking is the lead message, but the flat claim is
  // gated on written per-retailer confirmation (Appendix A Q14). Until
  // every retailer's confirmation is recorded, the soft form renders.
  const claim = stackingClaim(main);
  const strong = claim === "strong";

  const joinHref = await svcPath("/join");
  const packagesHref = await svcPath("/packages");
  const howHref = await svcPath("/how-it-works");
  const faqHref = await svcPath("/faq");

  return (
    <div>
      {/* The promise. Green, white text, one amber element: the primary
          action, inside the first screen on a 360px phone. */}
      <section className="bg-svc-green px-4 py-14 text-white sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            South Africa&apos;s savings membership
          </p>
          <h1 className="mt-3 max-w-2xl font-svc-heading text-3xl font-bold leading-tight sm:text-5xl">
            {strong
              ? "These coupons work on top of your own store savings."
              : "Coupons designed to work alongside your own store savings."}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            You already have Xtra Savings or Smart Shopper.{" "}
            {strong
              ? "SVC coupons stack on top of them. Same trip, same card, extra money off."
              : "SVC coupons are designed to work alongside them. Same trip, same card."}{" "}
            Dis-Chem, Checkers, Shoprite and Pick n Pay.
            {monthly ? ` ${monthly} a month.` : ""}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={joinHref} className={svcBtnPrimary}>
              {monthly ? `Join for ${monthly} a month` : "Join Smart Value Club"}
            </Link>
            <Link href={packagesHref} className={svcBtnOutlineOnDark}>
              See what you get
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-white/85">
            {strong
              ? "Not instead of your loyalty card. On top of it."
              : "Not instead of your loyalty card. Alongside it."}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
            <li>No contracts or lock-ins</li>
            <li>Cancel anytime</li>
            <li>Secure payment</li>
            <li>Built for SA households</li>
          </ul>
        </div>
      </section>

      {/* The value breakdown: cream, near-black text, the one big number in
          amber. Face value stated as face value, summed live from the
          package in the database, never typed into this file. */}
      <section className="bg-svc-cream px-4 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
            What your membership holds each month
          </h2>
          {faceValue ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed">
              This month&apos;s package carries a combined face value of{" "}
              <span className="font-svc-heading text-2xl font-bold text-svc-amber">{faceValue}</span>
              {" "}across coupons, education and the magazine.
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-base leading-relaxed">
              The month&apos;s package is being finalised. Every benefit and its
              face value will be listed here.
            </p>
          )}
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-svc-ink/70">
            Face value is what the benefits are worth on paper. What you actually
            save depends on which ones you use, and once you join, your dashboard
            counts your real savings in Rand. We would rather show you that
            number than promise you this one.
          </p>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-svc-blue">
            {strong
              ? "This is on top of whatever your store card already saves you."
              : "This is designed to work alongside whatever your store card already saves you."}
          </p>

          {main && main.benefits.length > 0 && (
            <div className="mt-8 grid gap-px bg-svc-ink/10 sm:grid-cols-2">
              {main.benefits.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-4 bg-svc-cream p-5">
                  <div>
                    <h3 className="font-svc-heading text-base font-bold">{b.name}</h3>
                    {b.description && (
                      <p className="mt-1 text-sm leading-relaxed text-svc-ink/70">{b.description}</p>
                    )}
                    {/* Per retailer, per the 12.1 verification gate: the
                        strong line renders only for a retailer whose
                        written confirmation is recorded in admin. */}
                    {b.benefit_type === "coupon_pack" && (
                      <p className="mt-1 text-xs font-semibold text-svc-green">
                        {b.stacking_confirmed
                          ? "Stacks on top of this store's own loyalty savings."
                          : "Designed to work alongside this store's own loyalty savings."}
                      </p>
                    )}
                  </div>
                  {b.face_value_cents > 0 && (
                    <p className="shrink-0 text-sm font-bold text-svc-blue">
                      {formatRand(b.face_value_cents)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {main && (
            <p className="mt-6 text-base font-semibold">
              Your monthly cost: {formatRand(main.monthly_price_cents)}.
            </p>
          )}
        </div>
      </section>

      {/* Three steps. Blue, the information and step colour. */}
      <section className="bg-svc-blue px-4 py-14 text-white sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
            Simple as it gets
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Join SVC",
                body: "Sign up online in a few minutes with your cell number. Your membership activates as soon as your first payment goes through.",
              },
              {
                step: "2",
                title: "Get your coupons",
                body: "Fresh coupons land in your member account on the 1st of every month. Use them digitally, no printing required.",
              },
              {
                step: "3",
                title: "Save every month",
                body: "Redeem them at participating Dis-Chem, Checkers, Shoprite and Pick n Pay stores. They refresh next month.",
              },
            ].map((s) => (
              <div key={s.step} className="border-2 border-white/20 p-6">
                <p className="font-svc-heading text-3xl font-bold text-white/40">{s.step}</p>
                <h3 className="mt-2 font-svc-heading text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href={howHref} className={svcBtnOutlineOnDark}>
              How it all works
            </Link>
          </div>
        </div>
      </section>

      {/* Real stores, real trolleys. */}
      <section className="bg-svc-cream px-4 py-14 sm:py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row">
          <div className="w-full max-w-md">
            <Image
              src="/svc/home-shoppers.png"
              alt="Two shoppers checking their SVC coupons on a phone in a supermarket"
              width={600}
              height={600}
              className="h-auto w-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
              Made for the shops your household already uses
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed">
              Vitamins, baby care and skincare at Dis-Chem. Braai cuts, bakery
              and pantry staples at Checkers and Shoprite. Groceries, deli and
              everyday household items at Pick n Pay. Coupons are sourced
              through our coupon partner and redeem digitally at participating
              stores.
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed">
              Alongside the coupons, every membership includes the Moxie digital
              magazine, an online e-course and an e-book of your choice each
              month.
            </p>
            <div className="mt-6">
              <Link href={packagesHref} className={svcBtnGreen}>
                See the full package
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The draw. */}
      <section className="bg-svc-blue px-4 py-14 text-white sm:py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row-reverse">
          <div className="w-full max-w-sm">
            <Image
              src="/svc/draw-win.png"
              alt="Monthly members draw: win a R2,000 grocery voucher, five entries included every month"
              width={600}
              height={600}
              className="h-auto w-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
              The monthly members draw
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
              Every active member gets five entries into the monthly draw,
              automatically. No forms, no extra cost. You can earn extra entries
              through the savings you actually redeem during the month.
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
              Winners are announced in the first week of the following month,
              and every draw&apos;s result is published with the total number of
              entries, so you can see exactly how it was run.
            </p>
            <div className="mt-6">
              <Link href={await svcPath("/draw")} className={svcBtnOutlineOnDark}>
                How the draw works, and past results
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The honesty section. Near-black, the closing colour. This copy is
          the current site's best section, kept and tightened. */}
      <section className="bg-svc-ink px-4 py-14 text-white sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
            No schemes. No selling.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            SVC is not an MLM, not a pyramid scheme and not a get-rich-quick
            product. Many South Africans have been burned before, and we built
            this the other way around: you pay a monthly fee, you get the
            benefits. That is the full deal.
          </p>
          <ul className="mt-6 grid max-w-2xl gap-3 text-sm text-white/85 sm:grid-cols-2">
            <li className="border-l-4 border-svc-green pl-3">No referral requirements to get your full benefits</li>
            <li className="border-l-4 border-svc-green pl-3">No selling products to friends or family</li>
            <li className="border-l-4 border-svc-green pl-3">No upfront stock purchases or starter kits</li>
            <li className="border-l-4 border-svc-green pl-3">No ranks, no teams, no leaderboards</li>
          </ul>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/70">
            There is an optional referral thank-you if you tell a friend, and it
            is exactly that: optional. Your coupons and draw entries never
            depend on it.{" "}
            <Link href={howHref} className="font-semibold text-white underline hover:text-svc-amber">
              Read how referrals work
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ taster. */}
      <section className="bg-svc-cream px-4 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">Common questions</h2>
          <div className="mt-6 grid gap-px bg-svc-ink/10 sm:grid-cols-2">
            {[
              {
                q: "Do I need to refer people to get my coupons?",
                a: "No. Your coupons and draw entries are yours from day one. Referrals are optional and completely separate.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. No contracts, no lock-in periods, no cancellation fees. Your benefits stay active until the end of the month you have paid for.",
              },
              {
                q: "When do my coupons arrive?",
                a: "On the 1st of every month for all active members. You will get an email when they are ready.",
              },
              {
                q: "Is this an MLM or pyramid scheme?",
                a: "No. You pay the membership fee, you get the benefits. No selling, no teams, no ranks.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-svc-cream p-5">
                <h3 className="font-svc-heading text-base font-bold">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href={faqHref} className="font-semibold text-svc-blue underline hover:text-svc-green">
              All the questions, answered
            </Link>
          </div>
        </div>
      </section>

      {/* Closing action. Green again, one amber element. */}
      <section className="bg-svc-green px-4 py-14 text-white sm:py-20">
        <div className="mx-auto w-full max-w-6xl text-center">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-4xl">
            Start saving this month
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/85">
            Join today and your first coupons arrive with the next monthly
            issue. {monthly ? `${monthly} a month, cancel anytime.` : "Cancel anytime."}
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={joinHref} className={svcBtnPrimary}>
              Join Smart Value Club
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
