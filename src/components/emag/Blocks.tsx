import type { CSSProperties, ReactNode } from "react";
import type { Asset, Block, ListRow, Mark, RichText } from "@/lib/emag/types";

/**
 * Renders a run of text with its emphasis, without ever changing the text.
 *
 * The marks are offsets into the string, so this walks the string once and
 * wraps the marked ranges. Everything between marks is emitted verbatim,
 * which is the whole reason the model stores offsets instead of markup:
 * what comes out of here is the string that went in, split but not altered.
 *
 * Overlapping marks are not supported and are not offered in the editor.
 * Sorting by start and clamping to the previous mark's end means a bad pair
 * degrades to plain text rather than throwing away characters.
 */
export function Text({ content }: { content: RichText }) {
  const marks = (content.marks ?? [])
    .filter((m) => m.end > m.start && m.start >= 0 && m.end <= content.text.length)
    .sort((a, b) => a.start - b.start);

  if (marks.length === 0) return <>{content.text}</>;

  const out: ReactNode[] = [];
  let cursor = 0;

  marks.forEach((mark: Mark, i) => {
    const start = Math.max(mark.start, cursor);
    if (start >= mark.end) return;
    if (start > cursor) out.push(content.text.slice(cursor, start));
    const slice = content.text.slice(start, mark.end);
    out.push(
      mark.kind === "bold" ? (
        <strong key={i}>{slice}</strong>
      ) : mark.kind === "highlight" ? (
        // A mark element rather than a span with a colour, so the emphasis
        // survives being read aloud and being printed in one colour.
        <mark key={i} className="mx-mark">
          {slice}
        </mark>
      ) : (
        <em key={i}>{slice}</em>
      )
    );
    cursor = mark.end;
  });

  if (cursor < content.text.length) out.push(content.text.slice(cursor));
  return <>{out}</>;
}

function Figure({ asset }: { asset: Asset }) {
  const sideClass =
    asset.side === "full" || !asset.wrap
      ? "mx-figure--full"
      : asset.side === "left"
        ? "mx-figure--left"
        : "mx-figure--right";

  // The width applies whatever side the picture is on.
  //
  // It used to be ignored unless the picture was floated, and since a newly
  // uploaded picture sits across the column by default, the width slider
  // appeared to do nothing at all. That was the bug behind "I added an
  // image but can't see any change when I click the bar to resize".
  const style: CSSProperties = {};
  if (asset.widthPct && asset.widthPct < 100) {
    style.width = `${asset.widthPct}%`;
    // A narrow picture sitting across the column centres itself. Left
    // aligned it reads as a mistake rather than as a choice, and the
    // publisher who wants it hard left can float it left instead.
    if (asset.side === "full" || !asset.wrap) style.marginInline = "auto";
  }

  const finishClass = asset.finish && asset.finish !== "none" ? `mx-figure--${asset.finish}` : "";

  return (
    <figure className={`mx-figure ${sideClass} ${finishClass}`.trim()} style={style}>
      <div className="mx-figure__frame">
        {/* Deliberately a plain img rather than next/image. These are fixed
            physical sizes on a fixed page, the optimiser's responsive srcset
            has nothing to choose between, and the PDF export needs the
            source file rather than a rewritten URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.src} alt={asset.alt} />
        {asset.overlay ? (
          <span className="mx-figure__overlay" style={{ color: asset.overlay.color }}>
            {asset.overlay.text}
          </span>
        ) : null}
      </div>
      {asset.caption ? (
        <figcaption
          className={`mx-caption${asset.captionStyle === "italic" ? " mx-caption--italic" : ""}`}
        >
          {asset.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Rows({ rows }: { rows: ListRow[] }) {
  return (
    <div className="mx-rows">
      {rows.map((row, i) => (
        <div className="mx-rows__row" key={i}>
          <div className="mx-rows__tag">
            <span className="mx-rows__tag-main">{row.tag}</span>
            {row.tagNote ? <span className="mx-rows__tag-note">{row.tagNote}</span> : null}
          </div>
          <div className="mx-rows__detail">
            <p className="mx-rows__title">{row.title}</p>
            {row.meta ? <p className="mx-rows__meta">{row.meta}</p> : null}
            {row.body ? (
              <p className="mx-p">
                <Text content={row.body} />
              </p>
            ) : null}
            {row.link ? <p className="mx-rows__link">{row.link}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Blocks({ blocks, assets }: { blocks: Block[]; assets: Asset[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p className="mx-p" key={i}>
                <Text content={block.content} />
              </p>
            );

          case "subhead":
            // A plain block, sized to its words by the stylesheet.
            //
            // It used to be an inline-block inside a wrapper div, so that the
            // orange underline hugged the text rather than running the width
            // of the column. That worked, and it also silently added space:
            // an inline element sits on a line box, and the line box carries
            // the body's leading above and below it. Roughly three
            // millimetres of gap that no rule in the stylesheet asked for,
            // on top of the margins that were already too generous. That is
            // the rest of "the gaps are too big".
            return (
              <p className="mx-subhead" key={i}>
                {block.text}
              </p>
            );

          case "pullquote": {
            const quote = (
              <blockquote
                className={[
                  "mx-pullquote",
                  block.tone === "teal" ? "mx-pullquote--teal" : "mx-pullquote--orange",
                ].join(" ")}
              >
                <span className="mx-pullquote__bar" aria-hidden />
                <p className="mx-pullquote__text">
                  <Text content={block.content} />
                </p>
              </blockquote>
            );

            const partner = block.beside
              ? assets.find((a) => a.id === block.beside!.assetId)
              : undefined;

            if (!partner || !block.beside) return <div key={i}>{quote}</div>;

            const picture = (
              <figure className="mx-figure mx-figure--full" style={{ margin: 0 }}>
                <div className="mx-figure__frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={partner.src} alt={partner.alt} />
                </div>
                {partner.caption ? (
                  <figcaption
                    className={`mx-caption${partner.captionStyle === "italic" ? " mx-caption--italic" : ""}`}
                  >
                    {partner.caption}
                  </figcaption>
                ) : null}
              </figure>
            );

            const width = block.beside.widthPct ?? 46;

            return (
              <div className="mx-duo" key={i}>
                {block.beside.side === "left" ? (
                  <>
                    <div style={{ flex: `0 0 ${width}%` }}>{picture}</div>
                    <div style={{ flex: "1 1 auto" }}>{quote}</div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: "1 1 auto" }}>{quote}</div>
                    <div style={{ flex: `0 0 ${width}%` }}>{picture}</div>
                  </>
                )}
              </div>
            );
          }

          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List className="mx-list" key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Text content={item} />
                  </li>
                ))}
              </List>
            );
          }

          case "figure": {
            const asset = assets.find((a) => a.id === block.assetId);
            // A figure whose picture has not been chosen yet draws nothing
            // rather than a broken image box.
            //
            // An empty element rather than null, and that is not a detail.
            // The measuring pass in useMeasuredPages lines its heights up
            // with the block list by index, so a block that renders no
            // element at all shifts every block after it by one and the
            // measurement is silently abandoned. An article with an image
            // block and no picture chosen yet would then never paginate,
            // and the only symptom would be an approve button that stays
            // disabled for no visible reason.
            if (!asset) return <span key={i} style={{ display: "block", height: 0 }} />;
            return <Figure asset={asset} key={i} />;
          }

          case "stats":
            return (
              <div
                // Not full bleed. The charcoal headline band below it runs
                // edge to edge, but on July page 13 the statistics strip
                // stops at the text column, and the difference between the
                // two is visible on the page.
                className="mx-stats"
                key={i}
                style={
                  block.accent ? ({ ["--mx-stat-accent"]: block.accent } as CSSProperties) : undefined
                }
              >
                {block.cells.map((cell, j) => (
                  <div className="mx-stats__cell" key={j}>
                    <span className="mx-stats__n">{cell.figure}</span>
                    <span className="mx-stats__label">{cell.label}</span>
                    {cell.note ? <span className="mx-stats__note">{cell.note}</span> : null}
                  </div>
                ))}
              </div>
            );

          case "facts":
            // Device 01, Cover Story opener only. Four equal columns at
            // 45.5mm, which is the 182mm content width divided by four, so
            // it is expressed as a fraction rather than as a measurement
            // that would have to be kept in step with the margins.
            return (
              <div className="mx-facts" key={i}>
                {block.cells.map((cell, j) => (
                  <div className="mx-facts__cell" key={j}>
                    <span className="mx-facts__kicker">{cell.kicker}</span>
                    <span className="mx-facts__word">{cell.word}</span>
                    {cell.note ? <span className="mx-facts__note">{cell.note}</span> : null}
                  </div>
                ))}
              </div>
            );

          case "tip":
            // Device 03. Full content width always, never a side column,
            // never omitted. The editor enforces the "never omitted" half;
            // this only has to draw it.
            return (
              <aside className="mx-tip" key={i}>
                <span className="mx-tip__strip" aria-hidden />
                <div className="mx-tip__inner">
                  <span className="mx-tip__label">Moxie Tip</span>
                  <p className="mx-tip__body">
                    <Text content={block.content} />
                  </p>
                </div>
              </aside>
            );

          case "writer": {
            // Device 05. The photograph is optional here because a staff
            // piece does not always carry one, but the reference requires
            // it on every contributed article and the editor checks that.
            const photo = block.photoAssetId
              ? assets.find((a) => a.id === block.photoAssetId)
              : undefined;
            return (
              <div className="mx-writer" key={i}>
                {photo ? (
                  <div className="mx-writer__photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.alt} />
                  </div>
                ) : null}
                <div>
                  <span className="mx-writer__label">Written by</span>
                  <span className="mx-writer__name">{block.name}</span>
                  {block.bio ? (
                    <p className="mx-writer__bio">
                      <Text content={block.bio} />
                    </p>
                  ) : null}
                </div>
              </div>
            );
          }

          case "rows":
            return <Rows rows={block.rows} key={i} />;
        }
      })}
    </>
  );
}
