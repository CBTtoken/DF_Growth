import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Wrench } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { PostBar } from "@/components/board/PostBar";
import { listPosts } from "@/lib/board/queries";
import { BOARD_CATEGORIES, categoryFromSlug } from "@/lib/board/categories";
import { boardRobots } from "@/lib/board/visibility";

// Browse by trade. The category list is the same INDUSTRY_TAXONOMY the
// marketplace filter and both onboarding channels use, so a category means
// one thing across the whole platform.
export const revalidate = 300;
export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: categoryParam } = await params;
  const category = categoryFromSlug(categoryParam);
  if (!category) return {};

  const title = category.name;
  const description = `${category.name} businesses on DigitalFlyer, and what they have posted. Offers, items for sale and finished work, straight from the business.`;

  return {
    title,
    description,
    alternates: { canonical: `/board/category/${category.slug}` },
    // Installable as its own icon, see board/manifest.webmanifest.
    manifest: "/board/manifest.webmanifest",
    icons: { apple: "/api/icons/board?size=180" },
    ...boardRobots(),
  };
}

// Every category in the taxonomy is a real, fixed page, so these can be
// built ahead of a request rather than on first visit.
export function generateStaticParams() {
  return BOARD_CATEGORIES.map((category) => ({ category: category.slug }));
}

export default async function BoardCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categoryParam } = await params;
  const category = categoryFromSlug(categoryParam);
  if (!category) notFound();

  const posts = await listPosts({ category: category.slug });

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
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
            <Wrench size={16} className="text-brand-blue" />
            {category.name}
          </h1>
        </div>

        <div className="mt-3">
          <PostBar />
        </div>

        <div className="mt-5" />

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-14 text-center">
            <p className="text-base font-semibold text-neutral-ink">Nothing posted under {category.name} yet</p>
            <p className="max-w-md text-sm text-neutral-muted">
              Members in this trade are on the platform, they have just not posted to the board yet. The marketplace has
              every one of them.
            </p>
            <Link
              href={`/marketplace?industry=${encodeURIComponent(category.name)}`}
              className="mt-1 rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-dark"
            >
              {category.name} businesses
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
