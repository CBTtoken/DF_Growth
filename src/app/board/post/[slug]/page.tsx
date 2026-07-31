import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, MapPin, MessageCircle, MessageSquareText, Zap } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BoardPostCard } from "@/components/board/BoardPostCard";
import { BoardComments, ReportLink } from "@/components/board/BoardComments";
import { getPostBySlug, listPostsByMember } from "@/lib/board/queries";
import { listComments, likeState } from "@/lib/board/engagement";
import { kindLabel } from "@/lib/board/kinds";
import { areaSlug } from "@/lib/board/areas";
import { categoryForIndustry } from "@/lib/board/categories";
import { boardPrice, postedWhen } from "@/lib/board/format";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";
import { schemaTypeForIndustry } from "@/lib/schema-type";
import { truncateOnWord } from "@/lib/text";
import { boardRobots } from "@/lib/board/visibility";

// The page the whole build is for.
//
// Acceptance criterion 2: "Every post renders server-side and returns full
// content to a crawler, verified against a real fetch without JavaScript."
// So everything a reader or a crawler needs is in this server component:
// title, body, price, business, area, trade and the WhatsApp link. The only
// client JavaScript on the page is the copy-link button inside ShareRow, and
// the two share links themselves are plain anchors that work without it.
//
// force-static plus revalidate for the same reason as the area page. The
// publish action revalidates this exact path, so an edit is live immediately
// rather than up to five minutes later.
export const revalidate = 300;
export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const price = boardPrice(post.priceCents);
  const title = `${post.title} · ${post.authorName}`;
  const description = truncateOnWord(
    post.body ||
      `${kindLabel(post.kind)} from ${post.authorName}${post.city ? ` in ${post.city}` : ""}${
        price ? `. ${price}` : ""
      }.`,
    160
  );
  const url = `/board/post/${post.slug}`;

  // The generated card, not the site logo. A share into a WhatsApp group has
  // to land as the business name, the item and the price, which is
  // acceptance criterion 3, and only a rendered image can carry that.
  //
  // Naming the image explicitly matters: overriding openGraph replaces the
  // root layout's whole block, images included, which silently stripped the
  // share image from six pages in July.
  const image = `${SITE_URL}/api/og/board/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    // Installable as its own icon, see board/manifest.webmanifest.
    manifest: "/board/manifest.webmanifest",
    icons: { apple: "/api/icons/board?size=180" },
    // Unlisted until the board is announced. The share card above still
    // renders, so a tester sharing a link into a group chat gets the real
    // experience, it simply does not reach Google yet.
    // A person's post is real content for a person and thin content for
    // Google, so it is never indexed even once the board itself is public.
    ...(post.member ? boardRobots() : { robots: { index: false, follow: false } }),
  };
}

export default async function BoardPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const price = boardPrice(post.priceCents);
  const member = post.member;
  const whatsapp = toWhatsAppNumber(member?.whatsapp ?? null);
  const category = categoryForIndustry(member?.industry ?? null);
  // Phase 2. Read with no identity argument on purpose: this page is
  // statically rendered, and asking who the visitor is would read cookies
  // and turn the whole page dynamic. Whether this particular person has
  // already liked the post is settled in the browser after the first tap,
  // which is a fair trade for keeping the page in the cache.
  const [more, comments, likes] = await Promise.all([
    member ? listPostsByMember(member.id, post.id) : Promise.resolve([]),
    listComments(post.id),
    likeState(post.id, null),
  ]);
  const shareUrl = `${SITE_URL}/board/post/${post.slug}`;
  const shareText = price
    ? `${post.title}, ${price}, from ${post.authorName}`
    : `${post.title}, from ${post.authorName}`;

  // Breadcrumbs always, and a real Offer only when there is a real price.
  // A priced Offer with no price would be the kind of structured data that
  // gets a site penalised rather than featured.
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "The Board", item: `${SITE_URL}/board` },
      ...(post.city
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: post.city,
              item: `${SITE_URL}/board/area/${areaSlug(post.city)}`,
            },
          ]
        : []),
      { "@type": "ListItem", position: post.city ? 3 : 2, name: post.title, item: shareUrl },
    ],
  };

  const offerSchema =
    post.priceCents !== null
      ? {
          "@context": "https://schema.org",
          "@type": "Offer",
          name: post.title,
          description: post.body ?? undefined,
          price: (post.priceCents / 100).toFixed(2),
          priceCurrency: "ZAR",
          availability: "https://schema.org/InStock",
          url: shareUrl,
          image: post.photoUrl ?? undefined,
          offeredBy: {
            "@type": schemaTypeForIndustry((member?.industry ?? null)),
            name: post.authorName,
            url: `${SITE_URL}/${(member?.slug ?? "")}`,
            ...(post.city ? { address: { "@type": "PostalAddress", addressLocality: post.city } } : {}),
          },
        }
      : null;

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {offerSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }} />
      )}

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
        >
          <ChevronLeft size={14} /> The Board
        </Link>

        <article className="mt-4 overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card">
          {post.photoUrl && (
            <div className="relative aspect-[4/3] w-full bg-neutral-light">
              <Image
                src={post.photoUrl}
                alt={post.title}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="flex flex-col gap-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-blue-light px-3 py-1 text-xs font-bold text-brand-blue">
                {kindLabel(post.kind)}
              </span>
              <span className="text-xs text-neutral-muted">{postedWhen(post.publishedAt)}</span>
              {post.activeThisWeek && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Zap size={12} /> Active this week
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-3xl">
              {post.title}
            </h1>

            {price && <p className="text-2xl font-extrabold text-accent">{price}</p>}

            {post.body && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-mid sm:text-base">{post.body}</p>
            )}

            <BoardComments
              postSlug={post.slug}
              comments={comments}
              likeCount={likes.count}
              businessId={member?.id ?? null}
              businessName={member?.businessName ?? null}
              shareUrl={shareUrl}
              shareText={shareText}
            />


            {/* The business, and the two ways to reach it. Both work without
                an account on either side. */}
            <div className="mt-1 flex flex-col gap-3 rounded-xl border border-neutral-border bg-neutral-light p-4">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-neutral-border bg-white">
                  {member?.logoUrl ? (
                    <Image
                      src={member?.logoUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-full items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: (member?.brandColor ?? "#4a5568") }}
                      aria-hidden
                    >
                      {post.authorName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-ink">{post.authorName}</p>
                  <p className="truncate text-xs text-neutral-muted">
                    {member ? member.industry ?? "Local business" : "Posted by a person"}
                    {post.city ? ` · ${post.city}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                      `Hello, I saw your post on DigitalFlyer: ${post.title}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <MessageCircle size={15} />
                    Message on WhatsApp
                  </a>
                )}
                {member && (
                <Link
                  href={`/${member.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-border bg-white px-4 py-2.5 text-sm font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  <ExternalLink size={15} />
                  See the business
                </Link>
                )}
                {!member && (
                  <p className="text-sm text-neutral-mid">
                    Answer them in the comments below. This one was posted by a person, not a business.
                  </p>
                )}
              </div>

              {/* Phase 3. Next to WhatsApp, never instead of it: section 6
                  keeps both paths live and lets usage decide. Absent
                  entirely when the member has switched chat off. */}
              {/* A link to the chat screen rather than a form that unfolds
                  here. Dewald's correction: direct messaging should open
                  like WhatsApp, its own screen with the business at the top
                  and the box at the bottom, not a contact form inside a
                  post. */}
              {Boolean(member?.chatEnabled) && (
                <Link
                  href={`/board/chat/${(member?.slug ?? "")}`}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-brand-blue/30 bg-white px-4 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue-light"
                >
                  <MessageSquareText size={15} />
                  Message {post.authorName} directly
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {post.city && (
                <Link
                  href={`/board/area/${areaSlug(post.city)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  <MapPin size={12} /> More in {post.city}
                </Link>
              )}
              {category && (
                <Link
                  href={`/board/category/${category.slug}`}
                  className="inline-flex items-center rounded-full border border-neutral-border bg-white px-3.5 py-2 text-xs font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {category.name}
                </Link>
              )}
            </div>



            <div className="flex justify-end">
              <ReportLink targetType="post" targetId={post.id} postSlug={post.slug} />
            </div>
          </div>
        </article>

        {more.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-bold text-neutral-ink">More from {post.authorName}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((other) => (
                <BoardPostCard key={other.id} post={other} />
              ))}
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
