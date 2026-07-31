import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ConversationList } from "@/components/board/ConversationList";
import { AddToPhone } from "@/components/board/AddToPhone";
import { currentVisitor } from "@/lib/board/visitor";
import { listIdentityThreads } from "@/lib/board/chat";

// The person's inbox, as a conversation list rather than a reading pane.
//
// Tapping a row opens the full screen chat at /board/chat/<business>, which
// is the same screen the Message button on a post opens and the same one the
// phone icon opens into. One chat screen, reached three ways.
//
// Never indexed, whatever the board's visibility switch says: this is
// somebody's private conversation.
export const metadata: Metadata = {
  title: "Your messages",
  robots: { index: false, follow: false },
  manifest: "/board/messages/manifest.webmanifest",
  icons: { apple: "/api/icons/messages?size=180" },
};
export const dynamic = "force-dynamic";

export default async function BoardMessagesPage() {
  const identity = await currentVisitor();

  if (!identity) {
    return (
      <main className="flex flex-1 flex-col bg-neutral-light">
        <MarketingHeader />
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <MessageSquareText size={26} className="text-neutral-muted" />
          <h1 className="text-xl font-bold text-neutral-ink">Your messages live here</h1>
          <p className="max-w-md text-sm text-neutral-muted">
            Message a business from any post on the board and the conversation appears here. There is no password to
            remember, so on a new phone just message them again and their reply will bring you back.
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

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
        >
          <ChevronLeft size={14} /> The Board
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-ink">Messages</h1>

        <div className="mt-4">
          {threads.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-border bg-white p-10 text-center text-sm text-neutral-muted">
              No conversations yet. Message a business from any post on the board.
            </p>
          ) : (
            <ConversationList threads={threads} side="public" />
          )}
        </div>

        <div className="mt-6">
          <AddToPhone appName="Messages" dismissKey="board_messages_install_dismissed" />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
