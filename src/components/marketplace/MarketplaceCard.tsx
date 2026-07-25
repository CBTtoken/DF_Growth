import Image from "next/image";
import Link from "next/link";
import { MapPin, ExternalLink, MessageCircle, Star, Facebook, Instagram } from "lucide-react";

export type MarketplaceCardData = {
  slug: string;
  businessName: string;
  industry: string | null;
  city: string | null;
  tagline: string | null;
  thumbnailUrl: string | null;
  logoUrl: string | null;
  brandColor: string;
  rating: { average: number; count: number } | null;
  distanceLabel: string | null;
  whatsapp: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
};

// SA numbers are usually stored local (0XX...); wa.me needs full international
// digits, so a leading 0 becomes the 27 country code.
function waLink(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function Stars({ rating }: { rating: { average: number; count: number } }) {
  const full = Math.round(rating.average);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={13}
            className={i < full ? "fill-amber-400 text-amber-400" : "fill-neutral-border text-neutral-border"}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-neutral-ink">{rating.average.toFixed(1)}</span>
      <span className="text-xs text-neutral-muted">({rating.count})</span>
    </div>
  );
}

export function MarketplaceCard(props: MarketplaceCardData) {
  const {
    slug,
    businessName,
    industry,
    city,
    tagline,
    thumbnailUrl,
    logoUrl,
    brandColor,
    rating,
    distanceLabel,
    whatsapp,
    facebookUrl,
    instagramUrl,
  } = props;
  const initials = businessName.slice(0, 2).toUpperCase();

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover">
      <Link href={`/${slug}`} className="flex flex-1 flex-col">
        {/* Cover (clips the zooming image) */}
        <div className="relative h-40 shrink-0 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={businessName}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}b3)` }}
              aria-hidden
            >
              <span className="text-4xl font-black text-white/25">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {industry && (
            <span className="absolute right-2.5 top-2.5 rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {industry}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-3.5 pb-3 pt-8">
          <h3 className="text-sm font-bold leading-tight text-neutral-ink transition-colors group-hover:text-brand-blue">
            {businessName}
          </h3>
          {tagline && (
            <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-neutral-mid">{tagline}</p>
          )}
          {rating && (
            <div className="mt-2">
              <Stars rating={rating} />
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-muted">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">
              {city || "South Africa"}
              {distanceLabel ? ` · ${distanceLabel}` : ""}
            </span>
          </div>
        </div>
      </Link>

      {/* Logo, lifted out of the clipped cover so its overhang stays visible */}
      <div className="absolute left-3.5 top-[8.75rem] z-10 size-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={48} height={48} className="size-full object-cover" />
        ) : (
          <span
            className="flex size-full items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: brandColor }}
            aria-hidden
          >
            {initials}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3.5 pb-3.5">
        <Link
          href={`/${slug}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-blue py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
        >
          <ExternalLink size={12} />
          Visit Webpage
        </Link>
        {whatsapp && (
          <a
            href={waLink(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${businessName}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            <MessageCircle size={15} />
          </a>
        )}
        {facebookUrl && (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${businessName} on Facebook`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-border bg-white text-[#1877F2] transition-colors hover:bg-neutral-light"
          >
            <Facebook size={15} />
          </a>
        )}
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${businessName} on Instagram`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-border bg-white text-[#E1306C] transition-colors hover:bg-neutral-light"
          >
            <Instagram size={15} />
          </a>
        )}
      </div>
    </article>
  );
}
