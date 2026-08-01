import Image from "next/image";
import Link from "next/link";
import { coverUrl, type MoxieEdition } from "@/lib/moxie/editions";
import { moxiePath } from "@/lib/moxie/host";

/**
 * A cover thumbnail in the archive.
 *
 * A "coming soon" edition has no cover and no page to go to, so it renders
 * as a plain card rather than a link to a 404. It is not given a fake cover:
 * the design reference forbids placeholder content on any client-facing
 * page, and an invented cover for an edition nobody has designed yet is
 * exactly that.
 */
export async function EditionCard({ edition }: { edition: MoxieEdition }) {
  const cover = coverUrl(edition);
  const href = await moxiePath(`/editions/${edition.slug}`);
  const isComing = edition.status === "coming_soon";

  const inner = (
    <>
      <div className="relative aspect-[210/297] w-full overflow-hidden bg-moxie-charcoal">
        {cover ? (
          <Image
            src={cover}
            alt={`Moxie Magazine, ${edition.title} cover`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="font-moxie-label text-[0.65rem] font-bold uppercase tracking-[0.22em] text-moxie-orange">
              In production
            </span>
            <span className="font-moxie-display text-2xl font-bold text-white">
              {edition.title}
            </span>
          </div>
        )}
        {isComing && (
          <span className="font-moxie-label absolute left-0 top-3 bg-moxie-orange px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white">
            Coming soon
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-moxie-display text-lg font-bold text-moxie-charcoal">
          {edition.title}
        </h3>
        {edition.description && (
          <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-moxie-charcoal/70">
            {edition.description}
          </p>
        )}
        {!isComing && (
          <span className="font-moxie-label mt-3 text-xs font-bold uppercase tracking-[0.16em] text-moxie-orange">
            Read this edition
          </span>
        )}
      </div>
    </>
  );

  const shell =
    "group flex flex-col overflow-hidden border border-moxie-border bg-white transition duration-200";

  if (isComing) {
    return <div className={shell}>{inner}</div>;
  }

  return (
    <Link href={href} className={`${shell} hover:-translate-y-0.5 hover:border-moxie-orange`}>
      {inner}
    </Link>
  );
}
