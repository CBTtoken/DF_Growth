import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { EditionCard } from "@/components/moxie/EditionCard";
import { coverUrl, getComingEdition, getLatestEdition, listEditions } from "@/lib/moxie/editions";
import { getReader } from "@/lib/moxie/entitlement";
import { moxieCanonical, moxiePath, MOXIE_ORIGIN } from "@/lib/moxie/host";

// The layout sets a title template, and a template applies to routes below
// the layout, never to the page.tsx sitting beside it. Without absolute this
// page renders the raw default and skips the template, which reads as a bug
// in the template rather than in this file.
export const metadata: Metadata = {
  title: { absolute: "Moxie Magazine | South Africa's family discovery magazine" },
  alternates: { canonical: moxieCanonical("/") },
};

// Rendered per request, not cached. Every page here reads the session to
// decide what the header and the buttons say, and reading the session makes
// a route dynamic, so a revalidate value on these files would be a no-op
// claiming a cache that never happens.
export const dynamic = "force-dynamic";

// The topic strip that used to sit here, listing science, nature, history,
// travel, food, puzzles and arts, is gone. Dewald, 1 August 2026: the
// magazine is not yet really covering all seven, and a strip of promises the
// editions do not keep is worse than no strip.
//
// Nothing is lost for search. The hero paragraph directly above names the
// same subjects in a real sentence, which is where they were doing the work
// anyway, and a row of single words was never going to rank for any of them.
//
// What replaces it is the Reader Submissions section from the Editorial and
// Design Reference, section 8 item 15, brought onto the website. It is a
// standing part of every edition, so this asks for something the magazine
// genuinely publishes rather than inventing an engagement device.

export default async function MoxieHomePage() {
  const [latest, coming, editions, reader] = await Promise.all([
    getLatestEdition(),
    getComingEdition(),
    listEditions(),
    getReader(),
  ]);

  const [subscribeHref, editionsHref] = await Promise.all([
    moxiePath("/subscribe"),
    moxiePath("/editions"),
  ]);
  const latestHref = latest ? await moxiePath(`/editions/${latest.slug}`) : editionsHref;
  const cover = latest ? coverUrl(latest) : null;
  // Published only, and not the one already filling the hero.
  //
  // listEditions deliberately returns coming-soon editions too, because the
  // archive page wants to show them. This section does not: August is not a
  // previous edition, it has not happened yet, and it already has its own
  // teaser at the foot of this page. Filtering only on "is not the latest"
  // put August in here and left July out of both, which is exactly what it
  // looked like from the outside.
  const archive = editions
    .filter((e) => e.status === "published" && e.id !== latest?.id)
    .slice(0, 4);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name: "Moxie Magazine",
    alternateName: "Moxie",
    url: MOXIE_ORIGIN,
    inLanguage: "en-ZA",
    description:
      "South Africa's family discovery magazine. Science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80.",
  };

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="bg-moxie-charcoal">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
              {latest ? `${latest.title} · Out now` : "South Africa's family discovery magazine"}
            </p>
            <h1 className="font-moxie-display mt-4 text-4xl leading-[1.08] font-bold text-white sm:text-5xl lg:text-6xl">
              South Africa&rsquo;s family <span className="text-moxie-orange">discovery</span>{" "}
              magazine
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-moxie-cream/80">
              Science, nature, history, travel, food and puzzles, written for curious minds aged 8
              to 80. A new edition on the 1st of every month.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={latestHref}
                className="font-moxie-label inline-flex items-center bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
              >
                Read the latest edition
              </Link>
              <Link
                href={subscribeHref}
                className="font-moxie-label inline-flex items-center border border-moxie-cream/30 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-cream transition hover:bg-white/10"
              >
                Subscribe R49 a month
              </Link>
            </div>
          </div>

          {cover && (
            <div className="mx-auto w-full max-w-sm">
              <Link href={latestHref}>
                <Image
                  src={cover}
                  alt={`Moxie Magazine, ${latest?.title} cover`}
                  width={1191}
                  height={1684}
                  priority
                  className="w-full shadow-2xl shadow-black/50 transition duration-300 hover:-translate-y-1"
                />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-moxie-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-9 sm:px-8">
          <div className="max-w-2xl">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
              Reader submissions
            </p>
            <p className="font-moxie-display mt-2 text-2xl leading-snug font-bold text-moxie-charcoal sm:text-3xl">
              We would love to hear from you
            </p>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-moxie-charcoal/75">
              Moxie is built from what South Africans send in. A memory, a photograph, someone
              remarkable in your town, or something you think the rest of the country should
              know about. Send it to us and it could be in the next edition. Afrikaans is
              published exactly as you write it.
            </p>
          </div>
          <a
            href="mailto:editor@moxiemag.co.za?subject=Reader%20submission"
            className="font-moxie-label inline-flex items-center bg-moxie-charcoal px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-charcoal/85"
          >
            editor@moxiemag.co.za
          </a>
        </div>
      </section>

      {latest?.description && (
        <section className="bg-moxie-cream">
          <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
              In the {latest.title} edition
            </p>
            <p className="font-moxie-display mt-4 text-2xl leading-[1.4] text-moxie-charcoal sm:text-[1.7rem]">
              {latest.description}
            </p>
            <Link
              href={latestHref}
              className="font-moxie-label mt-7 inline-flex bg-moxie-charcoal px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-charcoal/85"
            >
              Open this edition
            </Link>
          </div>
        </section>
      )}

      {archive.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
                  The archive
                </p>
                <h2 className="font-moxie-display mt-2 text-3xl font-bold text-moxie-charcoal">
                  Previous editions
                </h2>
              </div>
              <Link
                href={editionsHref}
                className="font-moxie-label text-xs font-bold uppercase tracking-[0.16em] text-moxie-orange"
              >
                See every edition
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {archive.map((edition) => (
                <EditionCard key={edition.id} edition={edition} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Smart Value Club, in its own teal band. The design reference is
          explicit that the SVC palette and the Moxie palette never share a
          page; a single banded section is the one sanctioned place the two
          brands meet, kept away from the editorial colours above. */}
      <section className="bg-moxie-teal">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-8">
          <div>
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-mint">
              Smart Value Club members
            </p>
            <p className="font-moxie-display mt-2 text-2xl font-bold text-white">
              Moxie is included with your membership
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
              Your Smart Value Club email carries an access code for each edition. Open the
              edition and enter the code when you are asked for it.
            </p>
          </div>
          <Link
            href={editionsHref}
            className="font-moxie-label inline-flex bg-white px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-teal transition hover:bg-white/90"
          >
            Browse editions
          </Link>
        </div>
      </section>

      {coming && (
        <section className="bg-moxie-cream">
          <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
              Next edition
            </p>
            <h2 className="font-moxie-display mt-3 text-3xl font-bold text-moxie-charcoal">
              {coming.title}
            </h2>
            {coming.description && (
              <p className="mt-3 text-lg leading-relaxed text-moxie-charcoal/70">
                {coming.description}
              </p>
            )}
            <Link
              href={subscribeHref}
              className="font-moxie-label mt-7 inline-flex bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
            >
              Be a member when it lands
            </Link>
          </div>
        </section>
      )}

      <MoxieFooter />
    </main>
  );
}
