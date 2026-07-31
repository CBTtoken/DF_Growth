import Link from "next/link";
import { CalendarDays, ChevronRight, ImagePlus, Plus, Tag } from "lucide-react";

// The status box, borrowed from the one everybody already uses.
//
// Dewald's note: the New post action should be a prominent, longer centre
// bar directly under the filters, the way Facebook puts "What's on your
// mind" at the top of a feed. Somebody who lands on a notice board is there
// either to read it or to put something on it, and the second one had been
// a small button in a corner.
//
// A link rather than an inline form on purpose. The composer asks what kind
// of post this is first, and that question decides the rest of the fields,
// so it needs its own screen rather than an expanding box.
export function PostBar({ areaName }: { areaName?: string | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-border bg-white p-3 shadow-card">
      <Link
        href="/board/new"
        className="flex items-center gap-3 rounded-full border border-neutral-border bg-neutral-light px-4 py-3 text-sm text-neutral-muted transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <Plus size={17} />
        </span>
        <span className="truncate">
          Share a special, sell something, or ask for help{areaName ? ` in ${areaName}` : ""}
        </span>
      </Link>

      {/* The three things people actually post, as one-tap entries into the
          same composer. */}
      <div className="flex items-center gap-1 border-t border-neutral-border pt-2">
        <Link
          href="/board/new"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-neutral-mid transition-colors hover:bg-neutral-light"
        >
          <Tag size={14} className="text-accent" /> Special
        </Link>
        <Link
          href="/board/new"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-neutral-mid transition-colors hover:bg-neutral-light"
        >
          <ImagePlus size={14} className="text-brand-blue" /> For sale
        </Link>
        <Link
          href="/board/new"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-neutral-mid transition-colors hover:bg-neutral-light"
        >
          <span className="text-emerald-600">?</span> Looking for
        </Link>
      </div>
    </div>
  );
}

/**
 * Events live somewhere else, and this is the whole of the relationship
 * between the two.
 *
 * Dewald's decision: the board is notices and member specials, events have
 * their own section, and mixing them would clutter both.
 *
 * It started as a line of small grey text under the feed, which he found
 * and called hidden. Fair: somebody about to put an event on the board has
 * already decided what they are doing by the time they scroll past the
 * posts. So it is a real button now, sitting under the post bar, which is
 * exactly where that decision gets made.
 */
export function EventsPointer() {
  return (
    <Link
      href="/events"
      className="flex items-center gap-2.5 rounded-2xl border border-brand-blue/20 bg-brand-blue-light px-3.5 py-2.5 transition-colors hover:border-brand-blue/40"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-blue shadow-sm">
        <CalendarDays size={15} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-ink">
        Running an event? <span className="font-normal text-neutral-mid">Use the events section</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-brand-blue" />
    </Link>
  );
}
