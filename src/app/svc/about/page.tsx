import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "About",
  description:
    "Smart Value Club is a South African membership club built on a simple deal: you pay a monthly fee, you get real benefits, and your dashboard shows what you actually saved.",
  alternates: { canonical: svcCanonical("/about") },
};

export default async function AboutPage() {
  const joinHref = await svcPath("/join");
  const howHref = await svcPath("/how-it-works");

  return (
    <div>
      <section className="bg-svc-green px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">About Smart Value Club</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            A savings membership built for South African households, on one
            simple deal: you pay a small monthly fee, and you get benefits you
            can actually use.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-8 text-base leading-relaxed">
          <p>
            Groceries are where most household money goes, so that is where SVC
            starts: monthly coupons for Dis-Chem, Checkers, Shoprite and Pick n
            Pay, the stores most of us already shop at. Around the coupons sits
            the rest of the package: the Moxie digital magazine, an online
            e-course and an e-book every month, and the members draw.
          </p>
          <p>
            We hold ourselves to an unusual standard for this industry: we only
            want to tell you numbers we can prove. Package values on this site
            are stated as face value, what the benefits are worth on paper. Your
            own dashboard counts the Rand you actually saved, based on what you
            really used. If those numbers are good, they will do the talking.
          </p>
          <p>
            SVC is not a scheme. There is nothing to sell, nobody to recruit,
            and no rank to climb. The optional referral thank-you is small,
            capped at three levels, and fully explained before you ever share a
            link. Your benefits never depend on it.
          </p>
          <div className="border-l-4 border-svc-blue bg-white/60 p-5">
            <h2 className="font-svc-heading text-lg font-bold">Moxie Magazine, our sister brand</h2>
            <p className="mt-2">
              Moxie is South Africa&apos;s family discovery magazine: science,
              nature, history, travel, food and puzzles for curious minds aged 8
              to 80, published on the 1st of every month. Every SVC membership
              includes it, and it also lives on its own at{" "}
              <a
                href="https://moxiemag.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-svc-blue underline"
              >
                moxiemag.co.za
              </a>
              .
            </p>
          </div>
          <p>
            SVC is South African owned and built for South African households.
            If you want the detail of how the membership, the draw and the
            referral programme work,{" "}
            <Link href={howHref} className="font-semibold text-svc-blue underline">
              it is all written down in plain language
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-svc-ink px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h2 className="font-svc-heading text-2xl font-bold sm:text-3xl">Join the club</h2>
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
