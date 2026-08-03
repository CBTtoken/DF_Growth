import type { ReactNode } from "react";
import { AD_FORMATS, pillarFor } from "@/lib/emag/publication";
import type { Asset, Opener, RenderedPage } from "@/lib/emag/types";
import { Blocks, Text } from "./Blocks";

/**
 * The page frame every editorial page shares.
 *
 * Reading down a June or July page: an orange bar across the top, the
 * running head with a hairline under it, an orange rule down the left, the
 * live area, and a charcoal footer carrying the site and the page number.
 * That furniture never changes. What changes is what sits in the live area,
 * and that is the layout's business, not this component's.
 */
/**
 * What the footer prints. The publication's, not Moxie's.
 *
 * Passed in rather than imported, because this renderer is the one piece
 * that absolutely must not know which magazine it is drawing. Dewald,
 * 1 August 2026: the aim is a product for any editor and publisher, so
 * nothing below the surface may assume Moxie.
 */
export type Imprint = { site: string; credit: string };

export function PageFrame({
  page,
  imprint,
  children,
}: {
  page: RenderedPage;
  imprint: Imprint;
  children: ReactNode;
}) {
  const pillar = pillarFor(page.head.pillar);

  return (
    // BELIEVE is the only pillar with its own treatment, and it is carried
    // on the page rather than on each element, so a teal page cannot end up
    // half converted.
    //
    // The copyfitting squeeze rides along the same way: one custom property
    // on the page, and the line spacing and paragraph gaps both answer to
    // it, so a tightened article cannot end up half tightened.
    <div
      className={`mx-page${pillar.teal ? " mx-page--believe" : ""}`}
      style={
        page.tighten
          ? ({ ["--mx-fit"]: String(1 - page.tighten) } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mx-page__topbar" />

      <div className="mx-page__head">
        <span className="mx-page__head-left">{pillar.label}</span>
        <span className="mx-page__head-right">{page.head.section}</span>
      </div>

      <div className="mx-page__rule" />

      <div className="mx-page__body">{children}</div>

      <div className="mx-page__foot">
        <span>
          {imprint.site}
          {imprint.credit ? (
            <>
              <span className="mx-dot" />
              {imprint.credit}
            </>
          ) : null}
        </span>
        {page.folio !== undefined ? (
          <span className="mx-page__folio">{page.folio}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The headline block at the top of an article.
 *
 * Three shapes, and which one is used is the layout's decision rather than
 * a free choice: a photograph carrying the type, a charcoal band carrying
 * it, or nothing at all on a continuation page.
 */
export function OpenerBlock({
  opener,
  variant,
  assets,
}: {
  opener: Opener;
  variant: "banner" | "band";
  assets: Asset[];
}) {
  // A banner opener defaults to the large size and a band opener to the
  // small one, because that is how the published pages are set. The
  // article can override it, and nothing else can.
  const scale = opener.scale ?? (variant === "banner" ? "xl" : "lg");

  const headline = (
    <h1
      className={[
        "mx-display",
        scale === "xl" ? "mx-display--xl" : scale === "md" ? "mx-display--md" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {opener.headline}
      {opener.headlineTurn ? (
        <>
          {/* The break is part of the headline's shape in both editions:
              the sentence turns and the colour turns with it. */}
          <br />
          <span
            className="mx-display__turn"
            style={opener.turnColor ? { color: opener.turnColor } : undefined}
          >
            {opener.headlineTurn}
          </span>
        </>
      ) : null}
    </h1>
  );

  if (variant === "band") {
    return (
      <div className="mx-band mx-bleed">
        {opener.kicker ? <span className="mx-kicker">{opener.kicker}</span> : null}
        {headline}
      </div>
    );
  }

  const banner = assets.find((a) => a.id === opener.bannerAssetId);
  const overlayClass = [
    "mx-banner__overlay",
    opener.bannerType === "band" ? "mx-banner__overlay--band" : "",
    opener.bannerType === "top" ? "mx-banner__overlay--top" : "",
    // A solid band carries its own darkness, so a scrim under it would only
    // darken the picture twice.
    opener.bannerType !== "band" && opener.scrim === "none" ? "mx-banner__overlay--scrim-none" : "",
    opener.bannerType !== "band" && opener.scrim === "strong"
      ? "mx-banner__overlay--scrim-strong"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // A hero with no height set collapses to nothing, because the picture
    // inside it is sized to fill its parent and the parent has nothing to
    // fill. That is why switching an opener from the band to a photograph
    // appeared to remove the band and show nothing in its place. A hero
    // always has a height, and 90mm is a sensible one until the publisher
    // moves it.
    <div className="mx-banner mx-bleed" style={{ height: `${banner?.heightMm ?? 90}mm` }}>
      {banner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mx-banner__img"
          src={banner.src}
          alt={banner.alt}
          // The focal point steers the crop: a banner is the one place an
          // article picture is cut to a fixed frame, and the default centre
          // crop is what cuts the face out of a portrait shot.
          style={{ objectPosition: `${banner.focalX ?? 50}% ${banner.focalY ?? 50}%` }}
        />
      ) : null}
      <div className={overlayClass}>
        {opener.kicker ? <span className="mx-kicker">{opener.kicker}</span> : null}
        {headline}
        {opener.credit ? <p className="mx-banner__credit">{opener.credit}</p> : null}
      </div>
    </div>
  );
}

/**
 * Draws one page. The layout key chooses the structure; everything below
 * the masthead is the same stack of blocks in every case.
 */
export function MoxiePage({
  page,
  assets,
  imprint,
}: {
  page: RenderedPage;
  assets: Asset[];
  imprint: Imprint;
}) {
  const opener = page.opener;

  // A cover and an advertisement are pages, but they are not editorial
  // pages: neither carries a section label bar, and a cover carries no page
  // number because numbering it pushes every other page up by one.
  if (page.layout === "cover") {
    return <CoverPage page={page} assets={assets} imprint={imprint} />;
  }

  if (page.layout === "advert") {
    return <AdvertPage page={page} />;
  }

  return (
    <PageFrame page={page} imprint={imprint}>
      {page.preBlocks?.length ? (
        <div style={{ marginBottom: "4mm" }}>
          <Blocks blocks={page.preBlocks} assets={assets} />
        </div>
      ) : null}

      {opener ? (
        <OpenerBlock
          opener={opener}
          variant={page.layout === "hero-opener" ? "banner" : "band"}
          assets={assets}
        />
      ) : null}

      {/* Section 6: hero band base to body copy is 8mm. */}
      {opener?.standfirst ? (
        <p
          className={`mx-standfirst${opener.standfirstStyle === "plain" ? " mx-standfirst--plain" : ""}`}
          style={{ marginTop: opener ? "var(--mx-gap-section)" : undefined }}
        >
          <Text content={opener.standfirst} />
        </p>
      ) : null}

      {/* The standfirst already carries 4mm of padding under its rule, so
          adding a section gap on top of it put roughly eleven millimetres
          between the introduction and the first paragraph. They are two
          parts of the same opening and should read as one. */}
      <div
        style={{
          marginTop: opener ? (opener.standfirst ? 0 : "var(--mx-gap-section)") : 0,
        }}
      >
        <Blocks blocks={page.blocks} assets={assets} />
      </div>

      {/* The Next Edition teaser at the base of the contents page. Teal,
          because it is the one piece of forward-selling on the page. */}
      {page.nextEdition ? (
        <div className="mx-teaser">
          <span className="mx-teaser__label">Next edition</span>
          <p className="mx-teaser__title">{page.nextEdition.title}</p>
          {page.nextEdition.note ? (
            <p className="mx-teaser__note">{page.nextEdition.note}</p>
          ) : null}
        </div>
      ) : null}
    </PageFrame>
  );
}

/**
 * The front or back cover.
 *
 * The publication's name is the masthead, the edition line sits above it,
 * and the also-in-this-edition list is built from the running order rather
 * than typed, so it cannot list an article the edition no longer carries.
 */
function CoverPage({
  page,
  assets,
  imprint,
}: {
  page: RenderedPage;
  assets: Asset[];
  imprint: Imprint;
}) {
  const cover = assets.find((a) => a.slot === "cover");

  return (
    <div className="mx-page mx-cover">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mx-cover__img"
          src={cover.src}
          alt={cover.alt}
          style={{ objectPosition: `${cover.focalX ?? 50}% ${cover.focalY ?? 50}%` }}
        />
      ) : null}
      <div className="mx-cover__scrim" />

      <div className="mx-cover__top">
        {page.opener?.kicker ? (
          <span className="mx-cover__edition">{page.opener.kicker}</span>
        ) : null}
        <span className="mx-cover__masthead">{imprint.site.split(".")[0] || "Cover"}</span>
        <span className="mx-cover__section">{page.head.section}</span>
      </div>

      <div className="mx-cover__lead">
        {page.opener?.headline ? (
          <h1 className="mx-display mx-display--xl mx-cover__headline">{page.opener.headline}</h1>
        ) : null}
      </div>

      {page.blocks.length ? (
        <div className="mx-cover__also">
          <Blocks blocks={page.blocks} assets={assets} />
        </div>
      ) : null}

      <div className="mx-cover__foot">{imprint.credit}</div>
    </div>
  );
}

/**
 * A supplied advertisement.
 *
 * The builder places artwork into a slot and draws nothing inside it. An
 * advertisement with no artwork yet shows the slot and its size, so the
 * flatplan's warning has something to point at.
 */
function AdvertPage({ page }: { page: RenderedPage }) {
  const ad = page.ad;
  const format = ad?.format ?? "full";
  const box = AD_FORMATS[format];

  return (
    <div className="mx-page">
      <div
        className="mx-ad"
        style={{
          position: "absolute",
          inset: 0,
          width: `${box.widthPct}%`,
          height: `${box.heightPct}%`,
        }}
      >
        {ad?.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.artwork} alt={`Advertisement for ${ad.advertiser}`} />
        ) : (
          <span className="mx-ad__empty">
            {ad?.advertiser ?? "Advertisement"}, {box.label}, no artwork yet
          </span>
        )}
      </div>
      {page.folio !== undefined ? (
        <div className="mx-page__foot">
          <span />
          <span className="mx-page__folio">{page.folio}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A stack of fixed pages on a screen that is not A4.
 *
 * The pages are not resized, they are scaled: a page is a physical object
 * and the reader zooms it, which is how every digital magazine works and
 * what keeps the rendering identical to the PDF.
 */
export function PageDeck({
  pages,
  assets,
  imprint,
  zoom = 0.62,
}: {
  pages: RenderedPage[];
  assets: Asset[];
  imprint: Imprint;
  zoom?: number;
}) {
  return (
    <div className="mx mx-deck" style={{ ["--mx-zoom" as string]: zoom }}>
      {pages.map((page, i) => (
        <div className="mx-sheet" key={i}>
          <MoxiePage page={page} assets={assets} imprint={imprint} />
        </div>
      ))}
    </div>
  );
}
