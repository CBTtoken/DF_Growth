import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { coverUrl, getEdition, isFreeToRead } from "@/lib/moxie/editions";
import { canRead, getReader } from "@/lib/moxie/entitlement";
import { getEditionPages, readableText } from "@/lib/moxie/pages";
import { moxieCanonical, moxiePath, MOXIE_ORIGIN, SVC_URL } from "@/lib/moxie/host";
import { submitAccessCode } from "./code-actions";

// Rendered per request, not cached. Every page here reads the session to
// decide what the header and the buttons say, and reading the session makes
// a route dynamic, so a revalidate value on these files would be a no-op
// claiming a cache that never happens.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const edition = await getEdition(slug);
  if (!edition) return { title: "Edition not found" };

  const cover = coverUrl(edition);
  const url = moxieCanonical(`/editions/${edition.slug}`);

  return {
    title: `${edition.title} edition`,
    description: edition.description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `Moxie Magazine, ${edition.title}`,
      description: edition.description ?? undefined,
      locale: "en_ZA",
      // The cover, so a WhatsApp share shows the magazine rather than a
      // generic card. The old site's preview showed recipe text.
      images: cover ? [{ url: cover.startsWith("/") ? `${MOXIE_ORIGIN}${cover}` : cover }] : undefined,
    },
  };
}

export default async function EditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const { code: codeState } = await searchParams;
  const edition = await getEdition(slug);
  if (!edition) notFound();

  const [reader, access, pages, readHref, subscribeHref, loginHref, textHref] = await Promise.all([
    getReader(),
    canRead(edition),
    getEditionPages(slug),
    moxiePath(`/read/${slug}`),
    moxiePath("/subscribe"),
    moxiePath(`/login?next=/editions/${slug}`),
    moxiePath(`/editions/${slug}/text`),
  ]);

  const isFree = isFreeToRead(edition);

  const cover = coverUrl(edition);
  const isComing = edition.status === "coming_soon";
  const readable = readableText(pages);

  // Lead-in sampling. The opening of the edition is public and crawlable
  // from the day it is published, and the rest sits behind the reader.
  //
  // This is Google's own flexible sampling, not a trick: the sample is what
  // any visitor sees too. Showing a crawler the full text while gating a
  // person is cloaking, which risks deindexing a domain that already ranks,
  // and is the one thing this build must not do.
  const leadIn = readable[0]?.text.split("\n").slice(0, 8).join(" ") ?? null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    name: `Moxie Magazine, ${edition.title}`,
    description: edition.description ?? undefined,
    datePublished: edition.published_at ?? undefined,
    url: moxieCanonical(`/editions/${edition.slug}`),
    // The honest declaration that the full edition is gated. Without this,
    // publishing a sample and withholding the rest looks like cloaking to a
    // crawler; with it, it is a documented and permitted arrangement.
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".moxie-gated",
    },
    isPartOf: {
      "@type": "Periodical",
      name: "Moxie Magazine",
      issn: undefined,
      publisher: { "@type": "Organization", name: "Moxie Magazine" },
    },
  };

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="bg-moxie-charcoal">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
          <div className="mx-auto w-full max-w-xs lg:mx-0">
            {cover ? (
              <Image
                src={cover}
                alt={`Moxie Magazine, ${edition.title} cover`}
                width={1191}
                height={1684}
                priority
                className="w-full shadow-2xl shadow-black/50"
              />
            ) : (
              <div className="flex aspect-[210/297] w-full flex-col items-center justify-center gap-2 border border-white/15 px-6 text-center">
                <span className="font-moxie-label text-[0.65rem] font-bold uppercase tracking-[0.22em] text-moxie-orange">
                  In production
                </span>
                <span className="font-moxie-display text-3xl font-bold text-white">
                  {edition.title}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-orange">
              {isComing ? "Coming soon" : `Edition · ${edition.title}`}
            </p>
            <h1 className="font-moxie-display mt-3 text-4xl leading-[1.1] font-bold text-white sm:text-5xl">
              {edition.title}
            </h1>
            {edition.description && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-moxie-cream/85">
                {edition.description}
              </p>
            )}

            {!isComing && pages.length > 0 && (
              <p className="font-moxie-label mt-5 text-sm uppercase tracking-[0.14em] text-moxie-cream/60">
                {pages.length} pages
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {isComing ? (
                <span className="font-moxie-label inline-flex items-center border border-moxie-cream/25 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-cream/70">
                  In production
                </span>
              ) : access.allowed ? (
                <Link
                  href={readHref}
                  className="font-moxie-label inline-flex items-center bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
                >
                  Read this edition
                </Link>
              ) : access.reason === "sign_in_required" ? (
                <>
                  <Link
                    href={loginHref}
                    className="font-moxie-label inline-flex items-center bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
                  >
                    Sign in to read free
                  </Link>
                  <Link
                    href={subscribeHref}
                    className="font-moxie-label inline-flex items-center border border-moxie-cream/30 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-cream transition hover:bg-white/10"
                  >
                    Become a member
                  </Link>
                </>
              ) : (
                <Link
                  href={subscribeHref}
                  className="font-moxie-label inline-flex items-center bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
                >
                  Become a member to read
                </Link>
              )}
            </div>

            {!isComing && !access.allowed && (
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-moxie-cream/60">
                {access.reason === "sign_in_required"
                  ? "This edition is over 60 days old, so it is free. Create a free account to read it."
                  : "New editions are for members. Every edition opens to all readers 60 days after publication."}
              </p>
            )}

            {/* The free text version, once the edition has opened up. Linked
                from here rather than left to a sitemap entry alone: a page
                nothing links to is a page a crawler discounts, and a reader
                who does not want an account should be able to find it. */}
            {isFree && (
              <p className="mt-4 text-sm text-moxie-cream/70">
                Or{" "}
                <Link href={textHref} className="font-bold text-moxie-orange underline">
                  read this edition in full without an account
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </section>

      {/* The Smart Value Club way in, offered only when the reader does not
          already have access, so a member who can read is not shown a form
          asking them to prove something. In its own teal band: the design
          reference is explicit that the two palettes never share a page. */}
      {!isComing && !access.allowed && (
        <section className="bg-moxie-teal">
          <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
            <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-mint">
              Smart Value Club members
            </p>
            <p className="font-moxie-display mt-2 text-2xl font-bold text-white">
              Enter your access code
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Your <a href={SVC_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-current/40 underline-offset-2 transition hover:decoration-current">Smart Value Club</a> email carries a code for this edition. Enter it once
              and this device will not ask again.
            </p>

            <form
              action={submitAccessCode}
              className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="slug" value={edition.slug} />
              <input
                type="text"
                name="code"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Access code"
                aria-label="Access code"
                className="font-moxie-label w-full flex-1 border border-white/25 bg-white/10 px-4 py-3 text-base uppercase tracking-[0.14em] text-white placeholder:text-white/40 outline-none transition focus:border-white sm:max-w-xs"
              />
              <button
                type="submit"
                className="font-moxie-label bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-moxie-teal transition hover:bg-white/90"
              >
                Open the edition
              </button>
            </form>

            {codeState === "invalid" && (
              <p className="mt-3 text-sm font-medium text-white">
                That code is not valid for this edition.
              </p>
            )}
          </div>
        </section>
      )}

      {leadIn && (
        <section className="bg-moxie-cream">
          <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
            <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-orange">
              From this edition
            </p>
            <p className="mt-4 text-lg leading-[1.7] text-moxie-charcoal">{leadIn}</p>

            {!access.allowed && (
              <div className="moxie-gated mt-8 border-l-[3px] border-moxie-orange bg-white p-6">
                <p className="font-moxie-display text-xl font-bold text-moxie-charcoal">
                  There is a great deal more where that came from
                </p>
                <p className="mt-2 text-sm leading-relaxed text-moxie-charcoal/70">
                  {pages.length} pages of science, nature, history, travel, food and puzzles,
                  written for curious minds aged 8 to 80.
                </p>
                <Link
                  href={access.reason === "sign_in_required" ? loginHref : subscribeHref}
                  className="font-moxie-label mt-5 inline-flex items-center bg-moxie-charcoal px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-charcoal/85"
                >
                  {access.reason === "sign_in_required" ? "Sign in to read free" : "Become a member"}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <MoxieFooter />
    </main>
  );
}
