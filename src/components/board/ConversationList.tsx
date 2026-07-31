"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useState } from "react";
import type { ChatThread } from "@/lib/board/chat";
import { toggleFavourite } from "@/app/board/chat-actions";

// The conversation list, shaped like the one on everybody's phone.
//
// A full width row per conversation: who it is with, the last line, when,
// and the unread count on the right. Starred conversations sit at the top.
// The old version was a narrow column of names next to a reading pane, which
// is a desktop email client, not a chat app.
//
// The star is the honest half of Dewald's "favourites or custom contact
// list". A web app cannot reach a phone's contacts, and inventing a contact
// book nobody asked to fill in would be worse than nothing. Pinning the
// conversations somebody already has does the same job with no setup.
function whenLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function ConversationList({
  threads,
  side,
  hrefFor,
}: {
  threads: ChatThread[];
  side: "public" | "member";
  hrefFor: (thread: ChatThread) => string;
}) {
  const [starred, setStarred] = useState<Record<string, boolean>>(
    Object.fromEntries(threads.map((t) => [t.id, t.favourite]))
  );

  return (
    <ul className="flex flex-col divide-y divide-neutral-border overflow-hidden rounded-2xl border border-neutral-border bg-white">
      {threads.map((thread) => {
        const name = side === "member" ? thread.personName : thread.businessName;
        const isStarred = starred[thread.id] ?? thread.favourite;

        return (
          <li key={thread.id} className="relative">
            <Link href={hrefFor(thread)} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-neutral-light">
              <div className="size-12 shrink-0 overflow-hidden rounded-full border border-neutral-border bg-white">
                {side === "public" && thread.businessLogoUrl ? (
                  <Image src={thread.businessLogoUrl} alt="" width={48} height={48} className="size-full object-cover" />
                ) : (
                  <span
                    className="flex size-full items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: side === "public" ? thread.brandColor : "#4a5568" }}
                    aria-hidden
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold text-neutral-ink">{name}</p>
                  <span className={`shrink-0 text-[11px] ${thread.unread > 0 ? "font-bold text-brand-blue" : "text-neutral-muted"}`}>
                    {whenLabel(thread.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${thread.unread > 0 ? "font-semibold text-neutral-ink" : "text-neutral-muted"}`}>
                    {thread.preview
                      ? `${thread.previewSender === side ? "You: " : ""}${thread.preview}`
                      : "No messages yet"}
                  </p>
                  {thread.unread > 0 && (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Outside the link, so tapping the star does not open the chat. */}
            <button
              type="button"
              aria-label={isStarred ? "Remove from favourites" : "Add to favourites"}
              onClick={async () => {
                const next = !isStarred;
                setStarred((current) => ({ ...current, [thread.id]: next }));
                const result = await toggleFavourite(thread.id, side);
                if (result?.error) setStarred((current) => ({ ...current, [thread.id]: !next }));
              }}
              className="absolute right-2 top-2 rounded-full p-1.5 text-neutral-border transition-colors hover:text-amber-500"
            >
              <Star size={15} className={isStarred ? "fill-amber-400 text-amber-400" : ""} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
