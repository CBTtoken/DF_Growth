import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { ReferralExplainer } from "@/components/svc/ReferralExplainer";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How a Smart Value Club membership works: join with your cell number, receive your coupons and benefits on the 1st of every month, and track the Rand value you actually save.",
  alternates: { canonical: svcCanonical("/how-it-works") },
};

export default async function HowItWorksPage() {
  const joinHref = await svcPath("/join");

  return (
    <div>
      <section className="bg-svc-blue px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">How it works</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            One membership, one monthly issue of benefits, and a dashboard that
            counts what you actually saved. Here is the whole thing, in plain
            language.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-10">
          <div>
            <h2 className="font-svc-heading text-xl font-bold sm:text-2xl">1. You join with your cell number</h2>
            <p className="mt-2 text-base leading-relaxed">
              Your cell number is your membership number. We verify it with a
              one-time code when you sign up, and it is how your coupons are
              linked to you at the till. You also set an email and password so
              you can log in either way.
            </p>
          </div>
          <div>
            <h2 className="font-svc-heading text-xl font-bold sm:text-2xl">2. Your benefits arrive on the 1st</h2>
            <p className="mt-2 text-base leading-relaxed">
              On the 1st of every month, every active member&apos;s account is
              issued the month&apos;s package: grocery and pharmacy coupons for
              Dis-Chem, Checkers, Shoprite and Pick n Pay, the new Moxie
              edition, and your education benefits. We email you when they are
              ready. Coupons redeem digitally at participating stores, no
              printing required, and they refresh with the next month&apos;s
              issue.
            </p>
          </div>
          <div>
            <h2 className="font-svc-heading text-xl font-bold sm:text-2xl">3. Your dashboard counts your real savings</h2>
            <p className="mt-2 text-base leading-relaxed">
              Every coupon you use adds its Rand value to your personal savings
              counter. That number is built from what you actually redeemed,
              never from what the package was worth on paper. If you have not
              used anything yet, it shows you what is available instead of a
              made-up total. It is our way of keeping ourselves honest.
            </p>
          </div>
          <div>
            <h2 className="font-svc-heading text-xl font-bold sm:text-2xl">4. The monthly draw runs on top</h2>
            <p className="mt-2 text-base leading-relaxed">
              Every active member gets five free entries into the monthly draw,
              and you earn extra entries through the value you actually redeem
              during the month. Entries freeze at a published cutoff, the winner
              is picked by a seeded random draw, and the result is published
              with the total entry count so anyone can check how it was run.
            </p>
          </div>
          <div>
            <h2 className="font-svc-heading text-xl font-bold sm:text-2xl">5. Cancel whenever you like</h2>
            <p className="mt-2 text-base leading-relaxed">
              There are no contracts and no cancellation fees. Cancel from your
              dashboard and your benefits stay live until the end of the period
              you have paid for. That is the whole rule.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-svc-cream px-4 pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-4xl border-t-4 border-svc-green pt-10">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">
            The referral thank-you, explained properly
          </h2>
          <p className="mt-2 mb-6 text-base leading-relaxed text-svc-ink/75">
            Optional, small, and honest. These are the same words you will find
            in your dashboard, so nothing here will ever surprise you later.
          </p>
          <ReferralExplainer />
        </div>
      </section>

      <section className="bg-svc-green px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">Ready when you are</h2>
          <div className="mt-6 flex justify-center">
            <Link href={joinHref} className={svcBtnPrimary}>
              Join Smart Value Club
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
