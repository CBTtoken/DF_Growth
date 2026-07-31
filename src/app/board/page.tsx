import Link from "next/link";
import type { Metadata } from "next";
import { Store, UsersRound } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { BoardFilters } from "@/components/board/BoardFilters";
import { PostBar, EventsPointer } from "@/components/board/PostBar";
import { BoardMessagesLink } from "@/components/board/BoardMessagesLink";
import { AddToPhone } from "@/components/board/AddToPhone";
import { listAreas, listPosts } from "@/lib/board/queries";
import { POST_KINDS, kindFromParam } from "@/lib/board/kinds";
import { BOARD_CATEGORIES } from "@/lib/board/categories";
import { boardRobots } from "@/lib/board/visibility";
import { unreadForVisitor } from "@/lib/board/chat";

// The Board. A notice board, not an event finder.
//
// Reframed on Dewald's brief: this is where a member puts up a special and
// where somebody else asks for a plumber, and the two find each other. The
// old headline talked about what was happening near you, which reads like a
// what's-on listing and set the wrong expectation.
//
// Layout rebuilt to the same brief. Four short things before the first post
// rather than a hero, an area strip, an install card and a filter row: a
// line of copy, one row of filters, the post bar, then posts. Everything
// people already know from Facebook, in the order they know it.
export const metadata: Metadata = {
  title: "The Board",
  description:
    "The DigitalFlyer notice board. Specials and offers from local businesses, things for sale, and people looking for someone to do a job.",
  manifest: "/board/manifest.webmanifest",
  icons: { apple: "/api/icons/board?size=180" },
  ...boardRobots(),
};

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind: kindParam, q = "" } = await searchParams;
  const kind = kindFromParam(kindParam);

  const [posts, areas, unread] = await Promise.all([
    listPosts({ kind, search: q }),
    listAreas(),
    unreadForVisitor(),
  ]);

  const kindChip = "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors";
  const kindOn = "bg-brand-blue text-white";
  const kindOff = "text-neutral-mid hover:bg-white";

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        {/* One line, not a hero. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-ink sm:text-2xl">The Board</h1>
            <p className="mt-0.5 text-xs text-neutral-mid sm:text-sm">
              Specials from local businesses, things for sale, and people looking for help.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/board/contacts"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-border bg-white px-4 py-2 text-sm font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
            >
              <UsersRound size={16} />
              <span className="hidden sm:inline">Providers</span>
            </Link>
            <BoardMessagesLink unread={unread} />
          </div>
        </div>

        <div className="mt-4">
          <BoardFilters areas={areas} categories={BOARD_CATEGORIES} activeArea="" activeCategory="" query={q} />
        </div>

        {/* The kinds, one compact row rather than a block of chips. */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={q ? `/board?q=${encodeURIComponent(q)}` : "/board"} className={`${kindChip} shrink-0 ${kind === null ? kindOn : kindOff}`}>
            Everything
          </Link>
          {POST_KINDS.map((k) => (
            <Link
              key={k.id}
              href={`/board?kind=${k.param}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`${kindChip} shrink-0 ${kind === k.id ? kindOn : kindOff}`}
            >
              {k.label}
            </Link>
          ))}
        </div>

        <div className="mt-3">
          <PostBar />
        </div>

        <div className="mt-3">
          <EventsPointer />
        </div>

        <div className="mt-5">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-12 text-center">
              <Store size={26} className="text-neutral-muted" />
              <p className="text-base font-semibold text-neutral-ink">
                {q ? "Nothing matches that yet" : kind ? "Nothing posted under that yet" : "Nothing on the board yet"}
              </p>
              <p className="max-w-sm text-sm text-neutral-muted">
                {q || kind ? "Try Everything to see what else is up." : "Be the first. It takes about a minute."}
              </p>
              {(q || kind) && (
                <Link
                  href="/board"
                  className="rounded-full border border-neutral-border bg-white px-5 py-2.5 text-sm font-semibold text-neutral-mid hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  Everything
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <BoardPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Moved below the posts. It is useful, and it is not what somebody
            came here to read. */}
        <div className="mt-6">
          <AddToPhone appName="The Board" dismissKey="board_install_dismissed" />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
