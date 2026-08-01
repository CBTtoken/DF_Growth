import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MoxieTopRule } from "@/components/moxie/Chrome";
import { getEdition } from "@/lib/moxie/editions";
import { canRead, getReader } from "@/lib/moxie/entitlement";
import { getEditionPages, signEditionPages } from "@/lib/moxie/pages";
import { moxiePath } from "@/lib/moxie/host";

// The reader is never indexed. It is the gated part, the pages are served
// through expiring signed URLs, and a crawler would only ever see a wall.
// The indexable version of this content is the edition page and, after 60
// days, the article pages.
export const metadata: Metadata = {
  title: "Reading",
  robots: { index: false, follow: false },
};

export default async function ReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = await getEdition(slug);
  if (!edition) notFound();

  const access = await canRead(edition);
  if (!access.allowed) {
    // Sent back to the edition page rather than shown a wall here, because
    // that page carries the sample, the description and both ways in. A
    // dead end helps nobody.
    redirect(await moxiePath(`/editions/${slug}`));
  }

  const pages = await getEditionPages(slug);
  const signed = await signEditionPages(pages);
  const [reader, editionHref, editionsHref] = await Promise.all([
    getReader(),
    moxiePath(`/editions/${slug}`),
    moxiePath("/editions"),
  ]);

  if (signed.length === 0) {
    return (
      <main className="flex flex-1 flex-col bg-moxie-charcoal">
        <MoxieTopRule />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-moxie-display text-3xl font-bold text-white">
            This edition is not ready to read yet
          </h1>
          <p className="mt-3 text-moxie-cream/70">
            The pages are still being prepared. Nothing is wrong with your account.
          </p>
          <Link
            href={editionsHref}
            className="font-moxie-label mt-6 inline-flex bg-moxie-orange px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
          >
            Back to the archive
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-moxie-charcoal">
      <MoxieTopRule />

      {/* Sticky, because in a 51 page scroll the way out has to be reachable
          without going back to the top. */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-moxie-charcoal/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Link href={editionHref} className="inline-flex flex-col">
            <span className="font-moxie-display text-lg leading-none font-bold text-white">
              MOXIE
            </span>
            <span className="font-moxie-label text-[0.6rem] font-bold uppercase tracking-[0.2em] text-moxie-orange">
              {edition.title}
            </span>
          </Link>
          <div className="font-moxie-label flex items-center gap-5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-moxie-cream/70">
            <span>{signed.length} pages</span>
            <Link href={editionsHref} className="transition hover:text-white">
              Archive
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-5 sm:py-10">
        <div className="flex flex-col gap-4 sm:gap-6">
          {signed.map((page, i) => (
            <figure key={page.page} className="relative bg-black/20 shadow-xl shadow-black/40">
              <Image
                src={page.url}
                alt={`${edition.title}, page ${page.page}`}
                width={page.width}
                height={page.height}
                // The first two pages load eagerly so the reader opens on
                // something rather than on a blank column; the rest wait
                // until they are scrolled near. On a 51 page edition that is
                // the difference between 300KB and 9MB before a word is read.
                priority={i < 2}
                loading={i < 2 ? undefined : "lazy"}
                sizes="(min-width: 768px) 768px, 100vw"
                className="h-auto w-full"
                unoptimized
              />
            </figure>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-center">
          <p className="font-moxie-display text-2xl font-bold text-white">Have the Moxie.</p>
          <p className="font-moxie-label mt-2 text-xs uppercase tracking-[0.18em] text-moxie-cream/50">
            {reader ? "Thank you for reading" : "moxiemag.co.za"}
          </p>
          <Link
            href={editionsHref}
            className="font-moxie-label mt-6 inline-flex bg-moxie-orange px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-orange/85"
          >
            Read another edition
          </Link>
        </div>
      </div>
    </main>
  );
}
