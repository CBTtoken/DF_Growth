import Link from "next/link";
import { MessageCircle } from "lucide-react";

// The messenger entry, with the badge.
//
// Dewald's ask: it should behave like WhatsApp, where the number on the icon
// tells you somebody answered without you opening anything. This is correct
// on every page load and every navigation, which covers the way people
// actually move around a phone. It does not tick over while you sit still on
// one screen, because that needs a live connection rather than a query.
export function BoardMessagesLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/board/messages"
      className="relative inline-flex items-center gap-2 rounded-full border border-neutral-border bg-white px-4 py-2 text-sm font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
    >
      <MessageCircle size={16} />
      Messages
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
