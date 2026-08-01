import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { coverUrl, getLatestEdition } from "@/lib/moxie/editions";
import { getMembership, getReader } from "@/lib/moxie/entitlement";
import { MOXIE_PLANS } from "@/lib/moxie/membership";
import { moxieCanonical, moxiePath } from "@/lib/moxie/host";
import { startMembership } from "./actions";

export const metadata: Metadata = {
  title: "Become a member",
  description:
    "Read every new edition of Moxie Magazine the day it comes out. R49 a month, or R490 a year with two months free.",
  alternates: { canonical: moxieCanonical("/subscribe") },
};

const INCLUDED = [
  "Every new edition, the day it is published",
  "Read on your phone, tablet or computer",
  "The full archive, free 60 days after publication",
  "Cancel whenever you like",
];

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const [reader, latest, accountHref] = await Promise.all([
    getReader(),
    getLatestEdition(),
    moxiePath("/account"),
  ]);
  const membership = reader ? await getMembership(reader.id) : null;
  const cover = latest ? coverUrl(latest) : null;

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />

      <section className="bg-moxie-charcoal">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
              Membership
            </p>
            <h1 className="font-moxie-display mt-3 text-4xl leading-[1.08] font-bold text-white sm:text-5xl">
              Never miss an <span className="text-moxie-orange">edition</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-moxie-cream/80">
              A new Moxie on the 1st of every month. Science, nature, history, travel, food and
              puzzles, written for curious minds aged 8 to 80.
            </p>
            <ul className="mt-7 flex flex-col gap-2.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-moxie-cream/85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-moxie-orange" aria-hidden />
                  <span className="text-base leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {cover && (
            <div className="mx-auto w-full max-w-[15rem] lg:max-w-xs">
              <Image
                src={cover}
                alt={`Moxie Magazine, ${latest?.title} cover`}
                width={1191}
                height={1684}
                className="w-full shadow-2xl shadow-black/50"
              />
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
          {membership ? (
            <div className="border-l-[3px] border-moxie-teal bg-white p-8 text-center">
              <p className="font-moxie-display text-2xl font-bold text-moxie-charcoal">
                You are already a member
              </p>
              <p className="mt-2 text-sm text-moxie-charcoal/70">
                Your {membership.interval === "annual" ? "annual" : "monthly"} membership is
                active. Every new edition is yours the day it comes out.
              </p>
              <Link
                href={accountHref}
                className="font-moxie-label mt-6 inline-flex bg-moxie-charcoal px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
              >
                My account
              </Link>
            </div>
          ) : (
            <>
              {error === "checkout" && (
                <p className="mb-8 border-l-[3px] border-moxie-orange bg-white p-4 text-sm text-moxie-charcoal">
                  Something went wrong starting the payment. Nothing was charged. Please try
                  again.
                </p>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                {MOXIE_PLANS.map((plan) => (
                  <form
                    key={plan.interval}
                    action={startMembership}
                    className="flex flex-col border border-moxie-border bg-white p-7"
                  >
                    <input type="hidden" name="interval" value={plan.interval} />
                    <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.2em] text-moxie-orange">
                      {plan.name}
                    </p>
                    <p className="font-moxie-display mt-3 text-3xl font-bold text-moxie-charcoal">
                      {plan.priceLabel}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-moxie-charcoal/70">
                      {plan.note}
                    </p>
                    <button
                      type="submit"
                      className={`font-moxie-label mt-6 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition ${
                        plan.interval === "annual"
                          ? "bg-moxie-charcoal hover:bg-moxie-charcoal/85"
                          : "bg-moxie-orange hover:bg-moxie-orange/85"
                      }`}
                    >
                      Choose {plan.name.toLowerCase()}
                    </button>
                  </form>
                ))}
              </div>

              <p className="mt-8 text-center text-sm text-moxie-charcoal/60">
                Payments are handled by Paystack. Cards are never seen or stored by Moxie.
              </p>
            </>
          )}

          {/* The Smart Value Club route in, kept plain. It is a latch on a
              shared link, and calling it anything stronger would be a claim
              the mechanism cannot support. */}
          <div className="mt-12 border-l-[3px] border-moxie-teal bg-white p-7">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.2em] text-moxie-teal">
              Smart Value Club members
            </p>
            <p className="font-moxie-display mt-2 text-xl font-bold text-moxie-charcoal">
              Moxie is included with your membership
            </p>
            <p className="mt-2 text-sm leading-relaxed text-moxie-charcoal/70">
              Your Smart Value Club email carries an access code for each edition. Open the
              edition you want and enter the code when you are asked for it.
            </p>
          </div>
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
