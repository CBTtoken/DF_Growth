import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { PostBar } from "@/components/board/PostBar";
import { findArea, listPosts } from "@/lib/board/queries";
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

  const posts = await listPosts({ area: area.slug });
  
  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        {/* One line, not a hero. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/board"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
            >
              <ChevronLeft size={14} /> Back to the board
            </Link>
            <span className="text-neutral-border" aria-hidden>
              /
            </span>
            <h1 className="inline-flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-neutral-ink">
              <MapPin size={17} className="text-brand-blue" />
              {area.name}
            </h1>
          </div>
          <span className="text-xs text-neutral-muted">
            {area.count} {area.count === 1 ? "business" : "businesses"}
          </span>
        </div>

        <div className="mt-3">
          <PostBar areaName={area.name} />
        </div>

        <div className="mt-5" />

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
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <BoardPostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

      </div>

      <SiteFooter />
    </main>
  );
}
