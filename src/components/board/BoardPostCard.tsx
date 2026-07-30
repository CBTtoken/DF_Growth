import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, User, Zap } from "lucide-react";
import type { BoardPost } from "@/lib/board/queries";
import { kindLabel } from "@/lib/board/kinds";
import { areaSlug } from "@/lib/board/areas";
import { boardPrice, postedWhen } from "@/lib/board/format";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";

// One card, every kind of post, from a business or from a person.
//
// The two look deliberately similar. Dewald's point is that this is one
// board and not two, so a neighbour looking for a plumber sits in the same
// grid as a plumber offering a special, and the only visible difference is
// who wrote it and what a reader can do next.
//
// No like count and no view count anywhere on this card. There is no
// engagement column in board_posts to render even if the design asked.
export function BoardPostCard({ post }: { post: BoardPost }) {
  const price = boardPrice(post.priceCents);
  const member = post.member;
  const initials = post.authorName.slice(0, 2).toUpperCase();
  const whatsapp = toWhatsAppNumber(member?.whatsapp ?? null);
  const brandColor = member?.brandColor ?? "#4a5568";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover">
      <Link href={`/board/post/${post.slug}`} className="flex flex-1 flex-col">
        {post.photoUrl ? (
          <div className="relative h-44 shrink-0 overflow-hidden">
            <Image
              src={post.photoUrl}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-ink shadow-sm">
              {kindLabel(post.kind)}
            </span>
            {price && (
              <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                {price}
              </span>
            )}
          </div>
        ) : (
          <div
            className="flex h-16 shrink-0 items-center justify-between px-3.5"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}b3)` }}
          >
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-ink">
              {kindLabel(post.kind)}
            </span>
            {price && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-ink">
                {price}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
          <h3 className="text-sm font-bold leading-snug text-neutral-ink transition-colors group-hover:text-brand-blue">
            {post.title}
          </h3>
          {post.body && <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-neutral-mid">{post.body}</p>}

          <div className="mt-3 flex items-center gap-2 border-t border-neutral-border pt-2.5">
            <div className="size-8 shrink-0 overflow-hidden rounded-lg border border-neutral-border bg-white">
              {member?.logoUrl ? (
                <Image src={member.logoUrl} alt="" width={32} height={32} className="size-full object-cover" />
              ) : member ? (
                <span
                  className="flex size-full items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                  aria-hidden
                >
                  {initials}
                </span>
              ) : (
                // A person, not a business. A plain mark rather than a fake
                // logo, so nobody mistakes a neighbour for a company.
                <span className="flex size-full items-center justify-center bg-neutral-light text-neutral-muted" aria-hidden>
                  <User size={14} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-ink">{post.authorName}</p>
              <p className="truncate text-[11px] text-neutral-muted">
                {member?.industry ? `${member.industry} · ` : ""}
                {postedWhen(post.publishedAt)}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 px-3.5 pb-3.5">
        {post.city && (
          <Link
            href={`/board/area/${areaSlug(post.city)}`}
            className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-neutral-border bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
          >
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{post.city}</span>
          </Link>
        )}

        {post.activeThisWeek && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700">
            <Zap size={11} className="shrink-0" />
            Active this week
          </span>
        )}

        <div className="flex-1" />

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, I saw your post on DigitalFlyer: ${post.title}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${post.authorName}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            <MessageCircle size={15} />
          </a>
        )}
      </div>
    </article>
  );
}
