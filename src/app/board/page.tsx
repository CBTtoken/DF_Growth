import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Store } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { listAreas, listPosts } from "@/lib/board/queries";
import { POST_KINDS, kindFromParam } from "@/lib/board/kinds";
import { BOARD_CATEGORIES } from "@/lib/board/categories";
import { boardRobots } from "@/lib/board/visibility";

// The Board, Phase 1. Public, no account, nothing gated.
//
// Reads ?kind, which makes this route dynamic by definition, same as
// /marketplace. That is the right trade here: the individual post pages and
// the area pages are the ones a crawler needs served from the cache, and
// they are static with ISR. This page is the index a person browses.
export const metadata: Metadata = {
  title: "The Board",
  description:
    "What South African businesses are offering right now, area by area. Real offers, items for sale, and work just finished, posted by the businesses themselves.",
  ...boardRobots(),
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind: kindParam } = await searchParams;
  const kind = kindFromParam(kindParam);

  const [posts, areas] = await Promise.all([listPosts({ kind }), listAreas()]);

  // Only trades that actually have somebody in them get offered as a browse
  // path. An empty category page is a dead end for a person and thin content
  // for Google.
  const activeCategories = BOARD_CATEGORIES.filter((category) =>
    posts.some((post) => post.member.industry && category.subcategories.includes(post.member.industry))
  );

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors";

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-8 pt-12 sm:px-6 lg:pt-16">
        <div className="mx-auto max-w-6xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue">
            <span className="size-1.5 rounded-full bg-brand-blue" />
            The Board
          </span>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl lg:text-5xl">
            What local businesses are <span className="text-brand-blue">offering right now</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-mid sm:text-base">
            Offers, items for sale, news and finished work, posted by real South African businesses. Tap through to
            message any of them directly on WhatsApp. No account needed, on either side.
          </p>

          {/* Kind filters as real links rather than a form, so every view of
              the board is a URL a person can send to somebody. */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/board"
              className={`${chipBase} ${
                kind === null
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-neutral-border bg-white text-neutral-mid hover:border-brand-blue/40 hover:text-brand-blue"
              }`}
            >
              Everything
            </Link>
            {POST_KINDS.map((k) => (
              <Link
                key={k.id}
                href={`/board?kind=${k.param}`}
                className={`${chipBase} ${
                  kind === k.id
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-neutral-border bg-white text-neutral-mid hover:border-brand-blue/40 hover:text-brand-blue"
                }`}
              >
                {k.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Areas, as places with their own pages. Not a dropdown: the handoff
          asks for area identity rather than an area filter, and a link is the
          difference between the two. */}
      {areas.length > 0 && (
        <section className="border-y border-neutral-border bg-white px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-muted">
              <MapPin size={13} /> Browse by area
            </h2>
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <Link
                  key={area.slug}
                  href={`/board/area/${area.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {area.name}
                  <span className="text-[11px] font-bold text-neutral-muted">{area.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-14 text-center">
            <Store size={26} className="text-neutral-muted" />
            <p className="text-base font-semibold text-neutral-ink">
              {kind ? "Nothing posted under that yet" : "Nothing posted here yet"}
            </p>
            <p className="max-w-md text-sm text-neutral-muted">
              {kind
                ? "Try Everything to see what else members have put up."
                : "The board fills up as members post. In the meantime, every member business has a page of its own in the marketplace."}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {kind && (
                <Link
                  href="/board"
                  className="rounded-full border border-neutral-border bg-white px-4 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  Everything
                </Link>
              )}
              <Link
                href="/marketplace"
                className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-dark"
              >
                Browse the marketplace
              </Link>
            </div>
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

        {activeCategories.length > 0 && (
          <div className="mt-10 border-t border-neutral-border pt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-muted">Browse by trade</h2>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/board/category/${category.slug}`}
                  className="inline-flex items-center rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {category.name}
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
