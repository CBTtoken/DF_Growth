import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

export type EventCardData = {
  id: string;
  name: string;
  description: string | null;
  startIso: string;
  city: string;
  typeLabel: string;
  imageUrl: string | null;
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

export function EventCard({ id, name, description, startIso, city, typeLabel, imageUrl }: EventCardData) {
  const d = new Date(startIso);
  const month = d.toLocaleString("en-ZA", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleString("en-ZA", { weekday: "short" });

  return (
    <Link
      href={`/events/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover"
    >
      {/* Cover with date badge */}
      <div className="relative h-44 shrink-0 overflow-hidden bg-neutral-light">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-blue to-brand-blue-dark text-4xl" aria-hidden>
            📅
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Date badge */}
        <div className="absolute left-3 top-3 min-w-[52px] overflow-hidden rounded-xl border border-neutral-border bg-white/95 text-center shadow-md backdrop-blur-sm">
          <div className="bg-brand-blue px-2 pb-0.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-white">{month}</div>
          <div className="px-2 py-0.5 text-lg font-extrabold leading-none text-neutral-ink">{day}</div>
        </div>

        {/* Free tag */}
        <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
          Free
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="w-fit rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
          {typeLabel}
        </span>
        <h3 className="text-sm font-bold leading-tight text-neutral-ink transition-colors group-hover:text-brand-blue">
          {name}
        </h3>
        <div className="flex flex-col gap-0.5 text-xs text-neutral-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {weekday}, {day} {month} at {timeLabel(startIso)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {city}
          </span>
        </div>
        {description && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-mid">{description}</p>}
      </div>
    </Link>
  );
}
