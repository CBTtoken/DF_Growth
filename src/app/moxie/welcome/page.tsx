import type { Metadata } from "next";
import Link from "next/link";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { getLatestEdition } from "@/lib/moxie/editions";
import { getMembership, getReader } from "@/lib/moxie/entitlement";
import { moxiePath } from "@/lib/moxie/host";

export const metadata: Metadata = {
  title: "Welcome to Moxie",
  robots: { index: false, follow: false },
};

// Never cached. The whole question this page answers is whether the webhook
// has landed yet, and a cached answer to that is worthless.
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const reader = await getReader();
  const membership = reader ? await getMembership(reader.id) : null;
  const latest = await getLatestEdition();

  const [readHref, editionsHref, welcomeHref] = await Promise.all([
    latest ? moxiePath(`/read/${latest.slug}`) : moxiePath("/editions"),
    moxiePath("/editions"),
    moxiePath("/welcome"),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />

      <section className="flex flex-1 items-center bg-moxie-cream">
        <div className="mx-auto w-full max-w-xl px-5 py-20 text-center sm:px-8">
          {membership ? (
            <>
              <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
                You are in
              </p>
              <h1 className="font-moxie-display mt-3 text-4xl leading-tight font-bold text-moxie-charcoal">
                Welcome to Moxie
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-moxie-charcoal/75">
                Your membership is active. Every new edition is yours the day it comes out, and
                the archive is open to you as it ages.
              </p>
              <Link
                href={readHref}
                className="font-moxie-label mt-8 inline-flex bg-moxie-orange px-8 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
              >
                {latest ? `Read the ${latest.title} edition` : "Go to the archive"}
              </Link>
            </>
          ) : (
            <>
              <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
                Almost there
              </p>
              <h1 className="font-moxie-display mt-3 text-4xl leading-tight font-bold text-moxie-charcoal">
                Thank you
              </h1>
              {/* Honest about what is happening rather than pretending. The
                  payment confirmation reaches us separately from the browser
                  redirect, and it is usually a few seconds behind it. */}
              <p className="mt-4 text-lg leading-relaxed text-moxie-charcoal/75">
                Your payment went through. The confirmation reaches us a moment after you get
                back here, so your membership may take a few seconds to show up.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href={welcomeHref}
                  className="font-moxie-label inline-flex bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
                >
                  Check again
                </Link>
                <Link
                  href={editionsHref}
                  className="font-moxie-label inline-flex border border-moxie-border px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-charcoal transition hover:bg-white"
                >
                  Browse the archive
                </Link>
              </div>
              <p className="mt-6 text-sm text-moxie-charcoal/55">
                If it has not appeared after a minute or two, email editor@moxiemag.co.za and we
                will sort it out.
              </p>
            </>
          )}
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
