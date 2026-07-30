import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChatThreadView } from "@/components/board/ChatThreadView";
import { AddToPhone } from "@/components/board/AddToPhone";
import { currentBoardIdentity } from "@/lib/board/engagement";
import { listIdentityThreads, readThread } from "@/lib/board/chat";
import { replyAsPublic } from "@/app/board/chat-actions";

// The public person's inbox.
//
// Never indexed, whatever the board's visibility switch says: this is
// somebody's private conversation, and no version of the launch makes that
// crawlable. Dynamic by definition, since it reads their session.
export const metadata: Metadata = {
  title: "Your messages",
  robots: { index: false, follow: false },
  manifest: "/board/messages/manifest.webmanifest",
  icons: { apple: "/api/icons/messages?size=180" },
};
export const dynamic = "force-dynamic";

export default async function BoardMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const { thread: threadParam } = await searchParams;
  const identity = await currentBoardIdentity();

  if (!identity) {
    return (
      <main className="flex flex-1 flex-col bg-neutral-light">
        <MarketingHeader />
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <MessageSquareText size={26} className="text-neutral-muted" />
          <h1 className="text-xl font-bold text-neutral-ink">Your messages live here</h1>
          <p className="max-w-md text-sm text-neutral-muted">
            Message a business from any post on the board and the conversation appears here, on this
            device. There is no password to remember, so if you are on a new phone, message the business
            again from their post and enter the code we email you.
          </p>
          <Link
            href="/board"
            className="mt-1 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
          >
            Go to the board
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const threads = await listIdentityThreads(identity.id);
  const active = threadParam ? threads.find((t) => t.id === threadParam) : threads[0];
  const messages = active ? await readThread(active.id, "public") : [];

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
        >
          <ChevronLeft size={14} /> The Board
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-ink">Your messages</h1>

        <div className="mt-4 sm:max-w-md">
          <AddToPhone appName="Messages" dismissKey="board_messages_install_dismissed" />
        </div>

        {threads.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-neutral-border bg-white p-10 text-center text-sm text-neutral-muted">
            No conversations yet. Message a business from any post on the board.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
            <nav className="flex flex-col gap-1.5">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/board/messages?thread=${thread.id}`}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    active?.id === thread.id
                      ? "border-brand-blue bg-white text-brand-blue"
                      : "border-neutral-border bg-white text-neutral-mid hover:border-brand-blue/40"
                  }`}
                >
                  <span className="truncate">{thread.businessName}</span>
                  {thread.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {active && (
              <section className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-neutral-light p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-neutral-ink">{active.businessName}</h2>
                  <Link
                    href={`/${active.businessSlug}`}
                    className="text-xs font-semibold text-neutral-muted underline-offset-2 hover:text-brand-blue hover:underline"
                  >
                    See their page
                  </Link>
                </div>
                <ChatThreadView
                  messages={messages}
                  side="public"
                  otherName={active.businessName}
                  action={replyAsPublic.bind(null, active.id)}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
