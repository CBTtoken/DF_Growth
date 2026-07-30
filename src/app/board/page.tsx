import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Plus, Search, Store } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { AddToPhone } from "@/components/board/AddToPhone";
import { listAreas, listPosts } from "@/lib/board/queries";
import { POST_KINDS, kindFromParam } from "@/lib/board/kinds";
import { BOARD_CATEGORIES } from "@/lib/board/categories";
import { boardRobots } from "@/lib/board/visibility";

// The Board. Public, no account, nothing gated.
//
// Layout fixed after Dewald used it on a laptop and found no way to post:
// the New post button now sits directly above the grid in every view, with
// the filters beside it, rather than a button that only existed while the
// board was empty. His words: people will be looking for where to create a
// post on the notice board, so put it where the board is.
export const metadata: Metadata = {
  title: "The Board",
  description:
    "What South African businesses are offering right now, area by area. Real offers, items for sale, and work just finished, posted by the businesses themselves.",
  manifest: "/board/manifest.webmanifest",
  icons: { apple: "/api/icons/board?size=180" },
  ...boardRobots(),
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind: kindParam, q = "" } = await searchParams;
  const kind = kindFromParam(kindParam);

  const [posts, areas] = await Promise.all([listPosts({ kind, search: q }), listAreas()]);

  const activeCategories = BOARD_CATEGORIES.filter((category) =>
    posts.some((post) => post.member?.industry && category.subcategories.includes(post.member.industry))
  );

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors";
  const chipOff =
    "border-neutral-border bg-white text-neutral-mid hover:border-brand-blue/40 hover:text-brand-blue";
  const chipOn = "border-brand-blue bg-brand-blue text-white";

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
            What is happening <span className="text-brand-blue">near you</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-mid sm:text-base">
            Specials and things for sale from local businesses, and neighbours looking for someone to do a job. Anyone
            can post, and anyone can answer.
          </p>

          {/* Search, as a plain GET form, so every result is a URL somebody
              can send to somebody else. */}
          <form method="GET" className="mt-6 flex max-w-xl gap-2">
            {kind && <input type="hidden" name="kind" value={kindParam} />}
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search the board"
                className="w-full rounded-full border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
            >
              Search
            </button>
          </form>
        </div>
      </section>

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
                  className={`${chipBase} ${chipOff}`}
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
        <div className="mb-6 sm:max-w-md">
          <AddToPhone appName="The Board" dismissKey="board_install_dismissed" />
        </div>

        {/* The bar directly above the board: post on the left, filters
            beside it. This is the fix for the thing Dewald hit, and it is
            present in every view rather than only when the board is empty. */}
        <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-neutral-border pb-4">
          <Link
            href="/board/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <Plus size={16} /> New post
          </Link>

          <span className="mx-1 hidden h-6 w-px bg-neutral-border sm:block" aria-hidden />

          <Link href={q ? `/board?q=${encodeURIComponent(q)}` : "/board"} className={`${chipBase} ${kind === null ? chipOn : chipOff}`}>
            Everything
          </Link>
          {POST_KINDS.map((k) => (
            <Link
              key={k.id}
              href={`/board?kind=${k.param}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`${chipBase} ${kind === k.id ? chipOn : chipOff}`}
            >
              {k.label}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-14 text-center">
            <Store size={26} className="text-neutral-muted" />
            <p className="text-base font-semibold text-neutral-ink">
              {q ? "Nothing matches that yet" : kind ? "Nothing posted under that yet" : "Nothing posted here yet"}
            </p>
            <p className="max-w-md text-sm text-neutral-muted">
              {q || kind
                ? "Try Everything to see what else is up."
                : "Be the first. It takes about a minute, and anyone can post."}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Link
                href="/board/new"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
              >
                Post the first one
              </Link>
              {(q || kind) && (
                <Link
                  href="/board"
                  className="rounded-full border border-neutral-border bg-white px-5 py-2.5 text-sm font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  Everything
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-neutral-ink">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
              {q ? ` for "${q}"` : ""}
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
                <Link key={category.slug} href={`/board/category/${category.slug}`} className={`${chipBase} ${chipOff}`}>
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
