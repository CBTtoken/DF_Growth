import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { getEdition, isFreeToRead } from "@/lib/moxie/editions";
import { getReader } from "@/lib/moxie/entitlement";
import { getEditionPages, readableText } from "@/lib/moxie/pages";
import { moxieCanonical, moxiePath } from "@/lib/moxie/host";

/**
 * The readable text of an edition, in full, with no login.
 *
 * This is the page that resolves the tension in what Dewald asked for:
 * readers sign in to open the designed magazine, and Google gets real
 * content it can actually read.
 *
 * The alternative, showing a crawler text that a person cannot get to, is
 * cloaking. It risks deindexing a domain that is already ranking, which is
 * the single most expensive thing this build could do. So the text is
 * genuinely public, and the reason that costs nothing is that it is only
 * ever published for editions that are already free.
 *
 * It is not a replacement for the magazine. There are no photographs, no
 * layout and no page furniture, which is exactly why a member still has a
 * reason to sign in and read the real thing.
 */

async function loadPublicEdition(slug: string) {
  const edition = await getEdition(slug);
  if (!edition || edition.status !== "published") return null;

  // Gated editions have no text page at all, rather than a text page that
  // refuses. A URL that exists but 403s still gets crawled and still
  // reports a soft error; one that does not exist is simply not a page.
  if (!isFreeToRead(edition)) return null;

  return edition;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const edition = await loadPublicEdition(slug);
  if (!edition) return { title: "Not found" };

  return {
    title: `${edition.title}, in full`,
    description: edition.description ?? undefined,
    alternates: { canonical: moxieCanonical(`/editions/${edition.slug}/text`) },
    openGraph: {
      type: "article",
      locale: "en_ZA",
      title: `Moxie Magazine, ${edition.title}`,
      description: edition.description ?? undefined,
      publishedTime: edition.published_at ?? undefined,
    },
  };
}

export default async function EditionTextPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const edition = await loadPublicEdition(slug);
  if (!edition) notFound();

  const sections = readableText(await getEditionPages(slug));
  if (sections.length === 0) notFound();

  const [reader, editionHref, readHref] = await Promise.all([
    getReader(),
    moxiePath(`/editions/${slug}`),
    moxiePath(`/read/${slug}`),
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Moxie Magazine, ${edition.title}`,
    description: edition.description ?? undefined,
    datePublished: edition.published_at ?? undefined,
    inLanguage: "en-ZA",
    // True here, and it matters that it is true. The edition page declares
    // itself gated because it is; this one declares itself free because it
    // is. A blanket claim on both would be the thing that makes the
    // declaration worthless.
    isAccessibleForFree: true,
    mainEntityOfPage: moxieCanonical(`/editions/${edition.slug}/text`),
    publisher: { "@type": "Organization", name: "Moxie Magazine" },
    isPartOf: { "@type": "Periodical", name: "Moxie Magazine" },
  };

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="bg-moxie-charcoal">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-orange">
            Free to read · {edition.title}
          </p>
          <h1 className="font-moxie-display mt-3 text-4xl leading-[1.1] font-bold text-white sm:text-5xl">
            {edition.title}, in full
          </h1>
          {edition.description && (
            <p className="mt-4 text-lg leading-relaxed text-moxie-cream/80">
              {edition.description}
            </p>
          )}
          <p className="mt-5 text-sm leading-relaxed text-moxie-cream/60">
            This is the written content of the edition. The magazine itself, with its
            photography and layout, is in the reader.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={readHref}
              className="font-moxie-label inline-flex items-center bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
            >
              Open the magazine
            </Link>
            <Link
              href={editionHref}
              className="font-moxie-label inline-flex items-center border border-moxie-cream/30 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-moxie-cream transition hover:bg-white/10"
            >
              About this edition
            </Link>
          </div>
        </div>
      </section>

      <article className="flex-1 bg-moxie-cream">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          {sections.map((section) => (
            <section key={section.page} className="mb-10">
              <p className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.2em] text-moxie-charcoal/40">
                Page {section.page}
              </p>
              {section.text.split("\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="mt-3 text-[1.05rem] leading-[1.75] text-moxie-charcoal"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      <MoxieFooter />
    </main>
  );
}
