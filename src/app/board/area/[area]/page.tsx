import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { findArea, listAreas, listPosts } from "@/lib/board/queries";
import { areaHeading } from "@/lib/board/areas";
import { boardRobots } from "@/lib/board/visibility";

// An area is a place with a page, not a filter state. Handoff section 4:
// "Ek's van die Ooste works because people feel they belong to the Ooste.
// Copy the belonging, not the filter."
//
// Cached and revalidated rather than rendered per request, and force-static
// for the same reason [clientSlug]/page.tsx needs it: with a dynamic segment
// and no generateStaticParams, this Next.js version otherwise falls back to
// on-demand SSR and `revalidate` alone does nothing. No generateStaticParams
// here because the set of areas changes whenever a member edits his city,
// and the publish action already revalidates the affected area page.
export const revalidate = 300;
export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area: areaParam } = await params;
  const area = await findArea(areaParam);
  if (!area) return {};

  const title = areaHeading(area.name);
  const description = `Offers, items for sale and finished work from businesses in ${area.name}. Message them directly on WhatsApp, no account needed.`;

  return {
    title,
    description,
    alternates: { canonical: `/board/area/${area.slug}` },
    // Installable as its own icon, see board/manifest.webmanifest.
    manifest: "/board/manifest.webmanifest",
    icons: { apple: "/api/icons/board?size=180" },
    ...boardRobots(),
  };
}

export default async function BoardAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaParam } = await params;
  const area = await findArea(areaParam);

  // No member in this area means there is no page, rather than an empty page
  // that a crawler indexes and a person bounces off.
  if (!area) notFound();

  const [posts, allAreas] = await Promise.all([listPosts({ area: area.slug }), listAreas()]);
  const otherAreas = allAreas.filter((a) => a.slug !== area.slug).slice(0, 12);

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-8 pt-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/board"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
          >
            <ChevronLeft size={14} /> The Board
          </Link>
          <h1 className="mt-3 flex flex-wrap items-center gap-2 text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl">
            <MapPin size={26} className="text-brand-blue" />
            {areaHeading(area.name)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-mid sm:text-base">
            {area.count} {area.count === 1 ? "business" : "businesses"} in {area.name} on DigitalFlyer. What they have
            posted is below, newest first.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-14 text-center">
            <p className="text-base font-semibold text-neutral-ink">Nobody in {area.name} has posted yet</p>
            <p className="max-w-md text-sm text-neutral-muted">
              There {area.count === 1 ? "is" : "are"} {area.count} {area.count === 1 ? "business" : "businesses"} here
              already. You can see {area.count === 1 ? "it" : "them"} in the marketplace while the board fills up.
            </p>
            <Link
              href={`/marketplace?city=${encodeURIComponent(area.name)}`}
              className="mt-1 rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-dark"
            >
              Businesses in {area.name}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-neutral-ink">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BoardPostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

        {otherAreas.length > 0 && (
          <div className="mt-10 border-t border-neutral-border pt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-muted">Other areas</h2>
            <div className="flex flex-wrap gap-2">
              {otherAreas.map((other) => (
                <Link
                  key={other.slug}
                  href={`/board/area/${other.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {other.name}
                  <span className="text-[11px] font-bold text-neutral-muted">{other.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
