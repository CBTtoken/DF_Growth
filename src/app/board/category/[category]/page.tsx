import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Wrench } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
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

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-8 pt-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/board"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
          >
            <ChevronLeft size={14} /> The Board
          </Link>
          <h1 className="mt-3 flex flex-wrap items-center gap-2 text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl">
            <Wrench size={24} className="text-brand-blue" />
            {category.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-mid sm:text-base">
            What {category.name.toLowerCase()} businesses on DigitalFlyer have posted, newest first.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BoardPostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

        <div className="mt-10 border-t border-neutral-border pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-muted">Other trades</h2>
          <div className="flex flex-wrap gap-2">
            {BOARD_CATEGORIES.filter((c) => c.slug !== category.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/board/category/${other.slug}`}
                className="inline-flex items-center rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
