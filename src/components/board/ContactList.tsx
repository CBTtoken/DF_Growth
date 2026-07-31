import Image from "next/image";
import Link from "next/link";
import { FileText, MessageCircle, UserRound } from "lucide-react";
import type { BoardContact } from "@/lib/board/contacts";

// A contact list that built itself.
//
// Nobody types a name into this. Every row is somebody a real conversation
// or a real document already names, which is why it has something in it on
// day one instead of being an empty address book waiting to be filled.
export function ContactList({ contacts, empty }: { contacts: BoardContact[]; empty: string }) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-border bg-white p-10 text-center text-sm text-neutral-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-border overflow-hidden rounded-2xl border border-neutral-border bg-white">
      {contacts.map((contact) => (
        <li key={contact.id} className="flex items-center gap-3 px-3 py-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-full border border-neutral-border bg-white">
            {contact.logoUrl ? (
              <Image src={contact.logoUrl} alt="" width={44} height={44} className="size-full object-cover" />
            ) : (
              <span
                className="flex size-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: contact.brandColor }}
                aria-hidden
              >
                {contact.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-neutral-ink">{contact.name}</p>
            <p className="truncate text-xs text-neutral-muted">
              {contact.source}
              {typeof contact.documentCount === "number" && contact.documentCount > 0 && (
                <>
                  {" · "}
                  {contact.documentCount} {contact.documentCount === 1 ? "document" : "documents"}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {contact.unread > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {contact.unread}
              </span>
            )}
            {contact.threadHref && (
              <Link
                href={contact.threadHref}
                aria-label={`Open the conversation with ${contact.name}`}
                className="rounded-lg border border-neutral-border bg-white p-2 text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
              >
                <MessageCircle size={15} />
              </Link>
            )}
            {contact.pageHref && (
              <Link
                href={contact.pageHref}
                aria-label={`${contact.name} page`}
                className="rounded-lg border border-neutral-border bg-white p-2 text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
              >
                <UserRound size={15} />
              </Link>
            )}
            {!contact.threadHref && !contact.pageHref && typeof contact.documentCount === "number" && (
              <span className="rounded-lg border border-neutral-border bg-neutral-light p-2 text-neutral-muted">
                <FileText size={15} />
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
