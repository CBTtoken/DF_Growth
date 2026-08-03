"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Blocks } from "./Blocks";
import { MoxiePage, OpenerBlock } from "./Page";
import { useMeasuredPages } from "./useMeasuredPages";
import { CoEditor } from "./CoEditor";
import { tidy } from "@/lib/emag/tidy";
import { useOverflowCheck } from "./useOverflowCheck";
import { describeTighten, suggestTighten } from "@/lib/emag/fit";
import type { Asset, Block, Opener, RenderedPage } from "@/lib/emag/types";
import { FocalPointPicker } from "@/components/emag/FocalPointPicker";
import type { LayoutKey, PillarKey } from "@/lib/emag/publication";
import { MarkedText } from "./MarkedText";
import type { Imprint } from "./Page";
import type { CoEditorDraft, CoEditorTurn } from "@/lib/emag/coeditor";

// The article editor.
//
// Not a chat interface, and there is no writing assistant in it. Dewald
// writes with Claude elsewhere and pastes the finished text in, so the job
// here is to take that text without touching it and show exactly what it
// will look like on the page.
//
// Two rules shape everything below.
//
// Text passes through as written. Every field is bound straight to the
// string. Nothing trims, nothing corrects, nothing reflows a sentence. What
// is stored is what was pasted, character for character.
//
// Layout is deterministic. Every adjustment is a named control, and the
// preview on the right is not an impression of the page, it is the page:
// the same components at the same size, scaled down.

type PillarOption = { key: PillarKey; label: string };
type SectionOption = { title: string; pillar: PillarKey; layout: LayoutKey };

type Props = {
  articleId?: string;
  editionId: string;
  editionTitle: string;
  pillars: PillarOption[];
  sections: SectionOption[];
  initial: {
    pillar: PillarKey;
    section: string;
    title: string;
    writer: string;
    layout: LayoutKey;
    opener: Opener;
    blocks: Block[];
    tighten?: number;
  };
  assets: Asset[];
  imprint: Imprint;
  /**
   * Changes a picture's placement from inside the body, where it is being
   * placed, rather than only from the Pictures panel above.
   *
   * Dewald, 1 August 2026: "is there no magical way to resize an image
   * after it is placed?" There was, and it was three panels away from the
   * picture it resized, which is the same as not having it.
   */
  onAssetPatch: (assetId: string, changes: Partial<Asset>) => Promise<void>;
  status: "draft" | "submitted" | "approved";
  canApprove: boolean;
  onSave: (draft: {
    id?: string;
    editionId: string;
    pillar: string;
    section: string;
    title: string;
    writer?: string;
    layout: string;
    opener: Opener;
    blocks: Block[];
    tighten?: number;
  }) => Promise<string>;
  onAskCoEditor: (articleId: string, turns: CoEditorTurn[]) => Promise<CoEditorDraft>;
  onSubmit: (id: string) => Promise<void>;
  onApprove: (id: string, pages: RenderedPage[]) => Promise<void>;
};

const BLOCK_LABELS: Record<Block["type"], string> = {
  p: "Paragraph",
  subhead: "Subheading",
  pullquote: "Pull quote",
  list: "List",
  figure: "Image",
  stats: "Stat block",
  facts: "Fact grid",
  tip: "Moxie Tip",
  writer: "Writer credit",
  rows: "Rows",
};

/**
 * Splits pasted text into the paragraphs it was written as.
 *
 * Dewald, 1 August 2026: "I pasted the text, with line breaks, but it puts
 * it in as one big paragraph", and then "seems I need to add a new paragraph
 * block for each paragraph, that won't work?". He was right on both counts.
 * A writer pastes a finished article, not one paragraph at a time, and a
 * textarea keeps the line breaks in the string while HTML collapses them, so
 * the page rendered as one unbroken slab.
 *
 * Blank lines separate paragraphs, which is how every word processor and
 * every chat window hands text over. A single line break inside a paragraph
 * is kept as part of that paragraph rather than treated as a split, because
 * a lot of pasted text is wrapped rather than deliberately broken.
 *
 * The only characters removed are the whitespace at the two ends of each
 * paragraph. Everything between the first and last visible character
 * survives exactly as pasted, which is what the byte-identical promise
 * actually needs: the splitting is a structural act the writer asked for,
 * not the software rewriting a sentence.
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

/**
 * What a closed block shows on its one line.
 *
 * Enough to find the paragraph you are looking for without opening it, and
 * short enough that thirty of them fit on a screen. Cut at a word boundary
 * rather than mid-word, because a summary that ends "the confusi" reads as
 * broken text rather than as a summary.
 */
function describeBlock(block: Block, assets: Asset[]): string {
  const shorten = (text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= 68) return clean || "Empty";
    return clean.slice(0, clean.lastIndexOf(" ", 68)) + "...";
  };

  switch (block.type) {
    case "p":
      return shorten(block.content.text);
    case "subhead":
      return shorten(block.text);
    case "pullquote":
      return shorten(block.content.text);
    case "tip":
      return shorten(block.content.text);
    case "writer":
      return block.name || "No name yet";
    case "list":
      return `${block.items.length} ${block.items.length === 1 ? "item" : "items"}`;
    case "figure": {
      const asset = assets.find((a) => a.id === block.assetId);
      if (!asset) return "No picture chosen";
      return `${asset.alt || asset.caption || "Untitled"}, ${asset.widthPct ?? 100}% wide`;
    }
    case "stats":
      return `${block.cells.length} figures`;
    case "facts":
      return `${block.cells.length} columns`;
    case "rows":
      return `${block.rows.length} rows`;
  }
}

function emptyBlock(type: Block["type"], assets: Asset[]): Block {
  switch (type) {
    case "p":
      return { type: "p", content: { text: "" } };
    case "subhead":
      return { type: "subhead", text: "" };
    case "pullquote":
      return { type: "pullquote", content: { text: "" }, tone: "orange" };
    case "list":
      return { type: "list", items: [{ text: "" }] };
    case "figure":
      return { type: "figure", assetId: assets[0]?.id ?? "" };
    case "stats":
      return { type: "stats", cells: [{ figure: "", label: "" }] };
    case "facts":
      return { type: "facts", cells: [{ kicker: "", word: "" }] };
    case "tip":
      return { type: "tip", content: { text: "" } };
    case "writer":
      return { type: "writer", name: "" };
    case "rows":
      return { type: "rows", rows: [{ tag: "", title: "" }] };
  }
}

export function ArticleEditor(props: Props) {
  const [pillar, setPillar] = useState<PillarKey>(props.initial.pillar);
  const [section, setSection] = useState(props.initial.section);
  const [title, setTitle] = useState(props.initial.title);
  const [writer, setWriter] = useState(props.initial.writer);
  const [layout, setLayout] = useState<LayoutKey>(props.initial.layout);
  const [opener, setOpener] = useState<Opener>(props.initial.opener);
  const [blocks, setBlocks] = useState<Block[]>(props.initial.blocks);
  const [articleId, setArticleId] = useState(props.articleId);
  const [status, setStatus] = useState(props.status);
  const [tighten, setTighten] = useState(props.initial.tighten ?? 0);

  /**
   * The pictures, as the server has them, with any placement change made in
   * the last second laid over the top.
   *
   * Dewald, 1 August 2026: "added an image but not available in the drop
   * down to add the image". The list used to be copied into state once, and
   * useState only ever reads its argument on the first render, so it was
   * frozen at whatever existed when the editor opened. Every upload after
   * that was invisible here, even though it had uploaded perfectly well.
   *
   * Deriving it fixes that without a synchronising effect. The server owns
   * which pictures exist, this component owns only the width or side being
   * dragged right now, and the two are combined at render. A save landing
   * mid-drag cannot yank the slider back, and a new upload appears the
   * moment the page revalidates.
   */
  // The preview is scaled to whatever room it has, rather than to a number
  // I picked.
  //
  // Dewald, 1 August 2026: "the page view is very small compared to the
  // section on the left, is it not possible to make the page view max out
  // and not fall off the screen?" It was pinned at 52 percent, which on a
  // wide screen wasted most of the column and made the type too small to
  // judge, which is the entire job of that pane.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewZoom, setPreviewZoom] = useState(0.52);

  useEffect(() => {
    const box = previewRef.current;
    if (!box) return;

    const A4_WIDTH_PX = (210 * 96) / 25.4;
    const fit = () => {
      // A little off for the scrollbar, so a page never sits half under it.
      const room = box.clientWidth - 14;
      if (room > 0) setPreviewZoom(Math.min(1, room / A4_WIDTH_PX));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const [overrides, setOverrides] = useState<Record<string, Partial<Asset>>>({});
  const assets = useMemo(
    () => props.assets.map((a) => (overrides[a.id] ? { ...a, ...overrides[a.id] } : a)),
    [props.assets, overrides]
  );

  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const probeRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLDivElement>(null);

  const head = useMemo(() => ({ pillar, section }), [pillar, section]);

  const heroAsset = assets.find((a) => a.id === opener.bannerAssetId);

  // Only one block is open at a time. A twenty paragraph article with every
  // textarea expanded is a page you cannot navigate, which is what Dewald
  // hit: "the page becomes really long to scroll".
  const [expanded, setExpanded] = useState<number | null>(0);
  const [dragging, setDragging] = useState<number | null>(null);

  const { pages, problems, ready, measured, openerHeightMm, liveHeightMm } = useMeasuredPages({
    head,
    layout,
    opener,
    blocks,
    tighten,
    probeRef,
    openerRef,
  });

  function patchBlock(index: number, next: Block) {
    setBlocks((current) => current.map((b, i) => (i === index ? next : b)));
  }

  // ---------------------------------------------------------- co-publisher
  //
  // Reads the same measurements the page breaks came from and works out
  // which picture is leaving a hole. Runs on every change, so the count is
  // always current, and does nothing until it is asked to.
  const report = useMemo(
    () =>
      tidy(measured, liveHeightMm - openerHeightMm, liveHeightMm, (block) => {
        if (block.type !== "figure") return null;
        const asset = assets.find((a) => a.id === block.assetId);
        if (!asset) return null;
        return { assetId: asset.id, widthPct: asset.widthPct ?? 100 };
      }),
    [measured, liveHeightMm, openerHeightMm, assets]
  );

  // Three lines stranded on a page of their own can usually be pulled back
  // by squeezing the whole article a fraction, which is what a designer
  // does by hand rather than cutting a sentence.
  const fitSuggestion = useMemo(
    () =>
      suggestTighten(
        { head, layout, opener, openerHeightMm, blocks: measured, liveHeightMm, tighten },
        measured,
        tighten
      ),
    [head, layout, opener, openerHeightMm, measured, liveHeightMm, tighten]
  );

  // Asks the drawn pages whether anything is spilling under the footer.
  const overflows = useOverflowCheck(previewRef, pages);

  function applyTidy() {
    for (const suggestion of report.suggestions) {
      patchAsset(suggestion.assetId, { widthPct: suggestion.toPct });
    }
  }

  /**
   * Changes a picture's placement, in the preview immediately and on the
   * server behind it.
   *
   * The save is not awaited and its failure is deliberately quiet. This
   * fires on every step of a slider, and a red band appearing because one
   * of thirty intermediate saves lost a race would be noise. The last one
   * wins, and if the whole thing is failing the publisher will find out the
   * moment they press Save or Approve, which do report.
   */
  function patchAsset(assetId: string, changes: Partial<Asset>) {
    setOverrides((current) => ({
      ...current,
      [assetId]: { ...current[assetId], ...changes },
    }));
    void props.onAssetPatch(assetId, changes).catch(() => {});
  }

  /**
   * Takes a whole pasted article and lays it out as blocks.
   *
   * Replaces the block that was pasted into, so pasting five paragraphs into
   * an empty paragraph gives five paragraphs rather than one, and pasting
   * into the middle of an article inserts them in place.
   */
  function pasteInto(index: number, text: string) {
    const paragraphs = splitIntoParagraphs(text);
    if (paragraphs.length === 0) return;

    setBlocks((current) => {
      const made: Block[] = paragraphs.map((paragraph) => ({
        type: "p",
        content: { text: paragraph },
      }));
      const next = [...current];
      next.splice(index, 1, ...made);
      return next;
    });
  }

  /** Moves a dragged block to where it was dropped. */
  function dropBlock(from: number, to: number) {
    if (from === to) return;
    setBlocks((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setExpanded(null);
  }

  /** Puts a new block straight after this one, and opens it. */
  function insertAfter(index: number, type: Block["type"]) {
    setBlocks((current) => {
      const next = [...current];
      next.splice(index + 1, 0, emptyBlock(type, assets));
      return next;
    });
    setExpanded(index + 1);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Everything a save needs, kept in a box that is replaced on every render
  // rather than passed through a dependency array.
  //
  // This is not tidiness, it is the fix for the autosave never firing. The
  // save function used to list `props` as a dependency, and `props` is a
  // fresh object every single render, so the function was fresh every
  // render, so the effect below tore down and restarted its timer every
  // render, so the timer never reached the end. It reported "Saving" and
  // saved nothing, which is why a refresh still lost the work.
  //
  // A ref has no identity to change, so the effect now depends only on the
  // article's actual contents, which is what should decide when to save.
  const latest = useRef({
    articleId,
    editionId: props.editionId,
    pillar,
    section,
    title,
    writer,
    layout,
    opener,
    blocks,
    tighten,
    onSave: props.onSave,
  });
  // Refreshed after each render rather than during it. Writing to a ref
  // while rendering is what React's rules of hooks forbid, and the timer
  // that reads it fires a second and a half later, long after every effect
  // has run, so there is nothing to race.
  useEffect(() => {
    latest.current = {
      articleId,
      editionId: props.editionId,
      pillar,
      section,
      title,
      writer,
      layout,
      opener,
      blocks,
      tighten,
      onSave: props.onSave,
    };
  });

  const save = useCallback((): Promise<string> => {
    const now = latest.current;
    return now.onSave({
      id: now.articleId,
      editionId: now.editionId,
      pillar: now.pillar,
      section: now.section,
      title: now.title,
      writer: now.writer,
      layout: now.layout,
      opener: now.opener,
      blocks: now.blocks,
      tighten: now.tighten,
    });
  }, []);

  // ---------------------------------------------------------------- saving
  //
  // Dewald, 1 August 2026: "on refresh it defaults back to one block
  // paragraph and removes all the other edits".
  //
  // He had not pressed Save, and that is not his mistake. An editor that
  // holds an hour of work in the browser and throws it away on a refresh is
  // broken, whatever the button says. Nobody writing a magazine should have
  // to remember to save.
  //
  // So it saves itself, quietly, a moment after typing stops. The delay is
  // there because saving on every keystroke would send a request per
  // character; a second and a half is long enough to batch a sentence and
  // short enough that no realistic interruption loses anything.
  const [saveState, setSaveState] = useState<"clean" | "dirty" | "saving" | "saved">("clean");
  const firstRender = useRef(true);

  useEffect(() => {
    // The first pass is the article arriving from the server, not an edit.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setSaveState("dirty");
    const timer = setTimeout(() => {
      setSaveState("saving");
      save()
        .then((id) => {
          setArticleId(id);
          setStatus("draft");
          setSaveState("saved");
        })
        .catch((e) => {
          setSaveState("dirty");
          setError(e instanceof Error ? e.message : "Could not save automatically.");
        });
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, writer, pillar, section, layout, opener, blocks, tighten, save]);

  // The last line of defence. If a save is still in flight, or failed, the
  // browser asks before the tab closes rather than letting the work go.
  useEffect(() => {
    if (saveState === "clean" || saveState === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  function run(label: string, work: () => Promise<void>) {
    setError(null);
    setMessage(null);
    startBusy(async () => {
      try {
        await work();
        setMessage(label);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    // The page gets the larger share. The form is a column of controls and
    // reads fine narrow; the page is the thing being judged and cannot be
    // judged at a third of its size.
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(340px, 0.85fr) minmax(420px, 1.15fr)",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/* ------------------------------------------------------------- form */}
      <div>
        <div style={panel}>
          <h2 style={panelTitle}>The article</h2>

          <label style={label}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 160px" }}>
              Pillar
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value as PillarKey)}
                style={input}
              >
                {props.pillars.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ ...label, flex: "1 1 160px" }}>
              Section
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                list="emag-sections"
                style={input}
              />
              <datalist id="emag-sections">
                {props.sections.map((s) => (
                  <option key={s.title} value={s.title} />
                ))}
              </datalist>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 160px" }}>
              Writer
              <input value={writer} onChange={(e) => setWriter(e.target.value)} style={input} />
            </label>
            <label style={{ ...label, flex: "1 1 160px" }}>
              Opens on
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as LayoutKey)}
                style={input}
              >
                <option value="hero-opener">A photograph</option>
                <option value="band-opener">A charcoal band</option>
                {/* The standing business-document look: modest ruled header,
                    tabular rows, no display type. Built for the rate card,
                    reusable by anything that is a price list rather than a
                    story. */}
                <option value="rate-card">A clean rate card</option>
              </select>
            </label>
          </div>
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>The masthead</h2>

          <label style={label}>
            Kicker
            <input
              value={opener.kicker ?? ""}
              onChange={(e) => setOpener({ ...opener, kicker: e.target.value })}
              style={input}
            />
          </label>

          <label style={label}>
            Headline
            <input
              value={opener.headline ?? ""}
              onChange={(e) => setOpener({ ...opener, headline: e.target.value })}
              style={input}
            />
          </label>

          <label style={label}>
            Accent words, on the second line
            <input
              value={opener.headlineTurn ?? ""}
              onChange={(e) => setOpener({ ...opener, headlineTurn: e.target.value })}
              style={input}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 140px" }}>
              Headline size
              <select
                value={opener.scale ?? "lg"}
                onChange={(e) => setOpener({ ...opener, scale: e.target.value as Opener["scale"] })}
                style={input}
              >
                <option value="md">28pt</option>
                <option value="lg">30pt</option>
                <option value="xl">36pt</option>
              </select>
            </label>

            {layout === "hero-opener" ? (
              <>
                <label style={{ ...label, flex: "1 1 140px" }}>
                  Type sits
                  <select
                    value={opener.bannerType ?? "gradient"}
                    onChange={(e) =>
                      setOpener({ ...opener, bannerType: e.target.value as Opener["bannerType"] })
                    }
                    style={input}
                  >
                    <option value="gradient">Low on the photo</option>
                    <option value="top">High on the photo</option>
                    <option value="band">In a solid band</option>
                  </select>
                </label>
                <label style={{ ...label, flex: "1 1 140px" }}>
                  Darken the photo
                  <select
                    value={opener.scrim ?? "light"}
                    onChange={(e) =>
                      setOpener({ ...opener, scrim: e.target.value as Opener["scrim"] })
                    }
                    style={input}
                  >
                    <option value="none">Not at all</option>
                    <option value="light">A little</option>
                    <option value="strong">A lot</option>
                  </select>
                </label>
              </>
            ) : null}
          </div>

          {layout === "hero-opener" ? (
            <>
              <label style={label}>
                Hero photograph
                <select
                  value={opener.bannerAssetId ?? ""}
                  onChange={(e) => setOpener({ ...opener, bannerAssetId: e.target.value })}
                  style={input}
                >
                  <option value="">None chosen</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.alt || a.caption || "Untitled image"}
                    </option>
                  ))}
                </select>
              </label>

              {assets.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "#7a5312", background: "#fdf5e6", padding: "8px 11px", margin: "0 0 10px", lineHeight: 1.5 }}>
                  Nothing to choose yet. Upload a picture with <strong>Add images</strong> at the
                  top, then pick it here. The kicker, the headline and the credit are set over
                  it automatically.
                </p>
              ) : null}

              {/* How tall the hero is, beside the picture that fills it,
                  rather than down in the Pictures panel. This is the control
                  that was missing: an opener switched to a photograph with
                  no height had nothing to show, which read as the band being
                  removed and nothing arriving. */}
              {heroAsset ? (
                <>
                  <label style={label}>
                    How tall, {heroAsset.heightMm ?? 90}mm of the 297mm page
                    <input
                      type="range"
                      min={30}
                      max={200}
                      step={1}
                      value={heroAsset.heightMm ?? 90}
                      onChange={(e) =>
                        patchAsset(heroAsset.id, { heightMm: Number(e.target.value) })
                      }
                      style={{ display: "block", width: "100%", marginTop: 6 }}
                    />
                  </label>
                  {/* The hero is the one picture in an article that is
                      cropped to fill a frame, so it is the one that needs
                      to know where its subject is. */}
                  <FocalPointPicker
                    src={heroAsset.src}
                    alt={heroAsset.alt}
                    focalX={heroAsset.focalX}
                    focalY={heroAsset.focalY}
                    onChange={(x, y) => patchAsset(heroAsset.id, { focalX: x, focalY: y })}
                  />
                </>
              ) : null}

              <label style={label}>
                Credit under the headline
                <input
                  value={opener.credit ?? ""}
                  onChange={(e) => setOpener({ ...opener, credit: e.target.value })}
                  placeholder="Photo supplied by"
                  style={input}
                />
              </label>
            </>
          ) : null}

          <label style={label}>
            Standfirst
            <textarea
              value={opener.standfirst?.text ?? ""}
              onChange={(e) => setOpener({ ...opener, standfirst: { text: e.target.value } })}
              rows={3}
              style={{ ...input, resize: "vertical" }}
            />
          </label>
        </div>

        {/* The co-editor lands its draft straight into the fields below, so
            everything after it, the measuring, the page breaks, the approve,
            behaves exactly as it does for text typed by hand. */}
        {articleId ? (
          <CoEditor
            articleId={articleId}
            currentOpener={opener}
            onAsk={props.onAskCoEditor}
            onAccept={(nextOpener, nextBlocks) => {
              setOpener(nextOpener);
              setBlocks(nextBlocks);
              setExpanded(null);
            }}
          />
        ) : null}

        <div style={panel}>
          <h2 style={panelTitle}>The body</h2>

          {/* The way a finished article actually arrives: in one piece, from
              wherever it was written. Paste it here and it becomes one block
              per paragraph, ready to be rearranged. */}
          <details style={{ marginBottom: 14 }}>
            <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#c85a1e" }}>
              Paste a whole article at once
            </summary>
            <p style={{ fontSize: 12.5, color: "#6b6864", margin: "8px 0", lineHeight: 1.5 }}>
              Drop the finished text in and it separates into paragraphs by itself. This
              replaces whatever is in the body now. Your words are not changed, only split
              where the blank lines are.
            </p>
            <textarea
              rows={6}
              placeholder="Paste the whole article"
              style={{ ...input, resize: "vertical" }}
              onChange={(e) => {
                const text = e.target.value;
                const paragraphs = splitIntoParagraphs(text);
                if (paragraphs.length === 0) return;
                setBlocks(paragraphs.map((p) => ({ type: "p", content: { text: p } })));
                e.target.value = "";
              }}
            />
          </details>

          {blocks.map((block, i) => {
            const open = expanded === i;
            return (
              <div
                key={i}
                // Dragged by the whole card, dropped onto whichever card it
                // is over. Twenty paragraphs is a long way to travel with an
                // Up button, which is the whole reason this is here.
                draggable
                onDragStart={() => setDragging(i)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging !== null) dropBlock(dragging, i);
                  setDragging(null);
                }}
                style={{
                  ...blockCard,
                  opacity: dragging === i ? 0.4 : 1,
                  cursor: "grab",
                }}
              >
                <div style={blockHead}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : i)}
                    style={summaryButton}
                    aria-expanded={open}
                  >
                    <span style={{ color: "#c85a1e", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {open ? "▾" : "▸"} {BLOCK_LABELS[block.type]}
                    </span>
                    {!open ? (
                      <span style={summaryText}>{describeBlock(block, assets)}</span>
                    ) : null}
                  </button>

                  <span style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
                    <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} style={tinyButton}>
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(i, 1)}
                      disabled={i === blocks.length - 1}
                      style={tinyButton}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlocks((c) => c.filter((_, j) => j !== i))}
                      style={{ ...tinyButton, color: "#8a1f1f" }}
                    >
                      Remove
                    </button>
                  </span>
                </div>

                {open ? (
                  <BlockFields
                    block={block}
                    assets={assets}
                    onChange={(next) => patchBlock(i, next)}
                    onPasteText={(text) => pasteInto(i, text)}
                    onAssetPatch={patchAsset}
                  />
                ) : null}

                {/* Adding a block puts it here, not at the bottom of the
                    article. Appending and then asking somebody to click Up
                    twenty times is not a workflow. */}
                <div style={insertRow}>
                  {(["p", "subhead", "pullquote", "figure"] as Block["type"][]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => insertAfter(i, type)}
                      style={insertButton}
                    >
                      + {BLOCK_LABELS[type].toLowerCase()} here
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(Object.keys(BLOCK_LABELS) as Block["type"][])
              .filter((t) => t !== "rows")
              .map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBlocks((c) => [...c, emptyBlock(type, assets)])}
                  style={addButton}
                >
                  Add {BLOCK_LABELS[type].toLowerCase()}
                </button>
              ))}
          </div>
        </div>

        <div style={{ ...panel, position: "sticky", bottom: 0 }}>
          {error ? <p style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>{error}</p> : null}
          {message ? <p style={{ ...notice, background: "#eaf5ea", color: "#1f6b2b" }}>{message}</p> : null}

          {/* The co-publisher.
              It reads the same measurements the page breaks came from, so
              what it offers to change is arithmetic rather than an opinion,
              and it gives the same answer every time. */}
          {/* Three lines alone on a page do not need the article cut.
              A squeeze nobody can see pulls them back, which is what a
              designer reaches for before a red pen. */}
          {fitSuggestion ? (
            <div style={{ ...notice, background: "#eef6f6", color: "#0b5555" }}>
              <strong>The last page has only {fitSuggestion.strandedMm}mm on it</strong>
              <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
                {describeTighten(fitSuggestion.tighten)} across the whole article would pull
                those lines back and lose the page. Nobody can see a change that small, and
                your words are untouched.
              </p>
              <button
                type="button"
                onClick={() => setTighten(fitSuggestion.tighten)}
                style={tidyButton}
              >
                Tighten and save the page
              </button>
            </div>
          ) : null}

          {tighten > 0 ? (
            <p style={{ fontSize: 12.5, color: "#6b6864", margin: "0 0 10px" }}>
              This article is set {describeTighten(tighten)} than the magazine&apos;s default.{" "}
              <button
                type="button"
                onClick={() => setTighten(0)}
                style={{ ...tinyButton, marginLeft: 4 }}
              >
                Put it back
              </button>
            </p>
          ) : null}

          {report.suggestions.length ? (
            <div style={{ ...notice, background: "#eef6f6", color: "#0b5555" }}>
              <strong>The co-publisher found {report.suggestions.length === 1 ? "a gap" : `${report.suggestions.length} gaps`}</strong>
              <ul style={{ margin: "6px 0 10px", paddingLeft: 18 }}>
                {report.suggestions.map((s, i) => (
                  <li key={i}>
                    Page {s.page} ends {s.closesMm}mm short because the picture below it will not
                    fit. Narrowing it from {s.fromPct}% to {s.toPct}% closes that.
                  </li>
                ))}
              </ul>
              <button type="button" onClick={applyTidy} style={tidyButton}>
                Close {report.suggestions.length === 1 ? "the gap" : "the gaps"}
              </button>
            </div>
          ) : null}

          {/* The drawn page's own verdict, which beats any calculation.
              If this ever appears, the measuring is wrong and I want to
              know about it rather than have it discovered in a printed
              edition. */}
          {overflows.length ? (
            <div style={{ ...notice, background: "#fdeaea", color: "#8a1f1f" }}>
              <strong>Text is running off the page</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {overflows.map((o, i) => (
                  <li key={i}>
                    Page {o.page} is {o.byMm}mm too full, so the last lines are sliding under the
                    footer. Shorten something on it, or make a picture on it smaller.
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.unfixable.length ? (
            <div style={{ ...notice, background: "#fdf5e6", color: "#7a5312" }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {report.unfixable.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {problems.length ? (
            <div style={{ ...notice, background: "#fdf5e6", color: "#7a5312" }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run("Saved.", async () => {
                  const id = await save();
                  setArticleId(id);
                  setStatus("draft");
                })
              }
              style={primaryButton}
            >
              Save
            </button>

            {/* Only shown to a writer.
                Dewald, 1 August 2026: "what is the reason behind send for
                approval if it stays on the same screen?" None, for him. It
                is how Jaco or Samantha hand a finished piece to the
                publisher, and a publisher approves their own work directly.
                Showing both buttons to somebody who only needs one is how a
                tool starts feeling like paperwork. */}
            {!props.canApprove ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run("Submitted. The publisher can see it now.", async () => {
                  const id = await save();
                  setArticleId(id);
                  await props.onSubmit(id);
                  setStatus("submitted");
                })
              }
              style={secondaryButton}
            >
              Submit for approval
            </button>
            ) : null}

            {props.canApprove ? (
              <button
                type="button"
                disabled={busy || !ready || pages.length === 0}
                onClick={() =>
                  run(`Approved. ${pages.length} pages, frozen.`, async () => {
                    const id = await save();
                    setArticleId(id);
                    await props.onApprove(id, pages);
                    setStatus("approved");
                  })
                }
                style={approveButton}
              >
                Approve, {pages.length} {pages.length === 1 ? "page" : "pages"}
              </button>
            ) : null}

            {/* Said out loud, so nobody has to wonder whether their work is
                safe. Silence about saving is what made a refresh feel like
                losing an hour. */}
            <span
              style={{
                fontSize: 13,
                fontWeight: saveState === "dirty" ? 700 : 400,
                color: saveState === "dirty" ? "#7a5312" : saveState === "saved" ? "#1f6b2b" : "#6b6864",
              }}
            >
              {saveState === "saving"
                ? "Saving"
                : saveState === "dirty"
                  ? "Unsaved changes"
                  : saveState === "saved"
                    ? "Saved"
                    : "Up to date"}
            </span>

            <span style={{ fontSize: 13, color: "#6b6864" }}>
              {status === "approved" ? "Approved" : status === "submitted" ? "Waiting for approval" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- preview */}
      {/* The preview scrolls on its own.
          Dewald: "the scrolling is not independent". It was sticky, which
          keeps it on screen but ties its scroll to the page, so a six page
          article could not be scrolled through while the form stayed put.
          A fixed height with its own overflow is what independent actually
          means. */}
      <div
        style={{
          position: "sticky",
          top: 20,
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p style={previewLabel}>
          {ready ? `${pages.length} ${pages.length === 1 ? "page" : "pages"}` : "Measuring"}
        </p>
        <div
          ref={previewRef}
          className="mx"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            overflowY: "auto",
            paddingRight: 4,
            minHeight: 0,
          }}
        >
          {pages.map((page, i) => (
            <div
              key={i}
              className="mx-sheet"
              style={{ ["--mx-zoom" as string]: previewZoom, margin: 0 }}
            >
              <MoxiePage page={page} assets={assets} imprint={props.imprint} />
            </div>
          ))}
        </div>
      </div>

      {/* The measuring column. Off screen but laid out, at exactly the width
          of a page's live area, with the real stylesheet applied. Not
          display:none, which would give every element a height of zero. */}
      <div className="mx" aria-hidden style={probeWrap}>
        <div
          className="mx-page"
          style={{
            height: "auto",
            width: "182mm",
            padding: 0,
            ...(tighten ? { ["--mx-fit"]: String(1 - tighten) } : {}),
          } as React.CSSProperties}
        >
          <div ref={openerRef}>
            {opener.headline ? (
              <>
                <OpenerBlock
                  opener={opener}
                  variant={layout === "hero-opener" ? "banner" : "band"}
                  assets={assets}
                />
                {opener.standfirst?.text ? (
                  <p className="mx-standfirst" style={{ marginTop: "var(--mx-gap-section)" }}>
                    {opener.standfirst.text}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
          <div ref={probeRef}>
            <Blocks blocks={blocks} assets={assets} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The fields for one block. One switch, so adding a block type is one place. */
function BlockFields({
  block,
  assets,
  onChange,
  onPasteText,
  onAssetPatch,
}: {
  block: Block;
  assets: Asset[];
  onChange: (next: Block) => void;
  onPasteText: (text: string) => void;
  onAssetPatch: (assetId: string, changes: Partial<Asset>) => void;
}) {
  switch (block.type) {
    case "p":
      // The multi-paragraph paste is handled inside MarkedText, for the same
      // reason it was handled here: by the time onChange fires the browser
      // has merged the paste into one string and the paragraph boundaries
      // are only recoverable from the clipboard itself.
      return (
        <MarkedText
          content={block.content}
          onChange={(content) => onChange({ ...block, content })}
          onPasteText={onPasteText}
          rows={5}
          placeholder="Paste your text here. Several paragraphs at once is fine, they will separate on their own."
          style={input}
        />
      );

    case "subhead":
      return (
        <input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          style={input}
        />
      );

    case "pullquote":
      return (
        <>
          <MarkedText
            content={block.content}
            onChange={(content) => onChange({ ...block, content })}
            rows={3}
            style={input}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 130px" }}>
              Bar colour
              <select
                value={block.tone}
                onChange={(e) => onChange({ ...block, tone: e.target.value as "orange" | "teal" })}
                style={input}
              >
                <option value="orange">Orange</option>
                <option value="teal">Teal</option>
              </select>
            </label>
            <label style={{ ...label, flex: "1 1 160px" }}>
              Beside a picture
              <select
                value={block.beside?.assetId ?? ""}
                onChange={(e) =>
                  onChange({
                    ...block,
                    beside: e.target.value
                      ? { assetId: e.target.value, side: block.beside?.side ?? "right", widthPct: block.beside?.widthPct ?? 34 }
                      : undefined,
                  })
                }
                style={input}
              >
                <option value="">On its own</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alt || "Untitled image"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      );

    case "list":
      return (
        <>
          {block.items.map((item, i) => (
            <input
              key={i}
              value={item.text}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((it, j) => (j === i ? { text: e.target.value } : it)),
                })
              }
              style={input}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, items: [...block.items, { text: "" }] })}
            style={addButton}
          >
            Add an item
          </button>
        </>
      );

    case "figure": {
      const asset = assets.find((a) => a.id === block.assetId);
      const width = asset?.widthPct ?? 100;

      // Named placements, because "38 or 42 percent" is a designer's
      // question and the publisher's question is "big or beside the text".
      // Image pass, 3 August 2026: one tap sets the side, the wrap and the
      // width together; the slider below stays for the last few percent.
      const placements: { name: string; side: Asset["side"]; wrap: boolean; widthPct: number }[] = [
        { name: "Full width", side: "full", wrap: false, widthPct: 100 },
        { name: "Wide, centred", side: "full", wrap: false, widthPct: 70 },
        { name: "Beside the text, left", side: "left", wrap: true, widthPct: 42 },
        { name: "Beside the text, right", side: "right", wrap: true, widthPct: 42 },
      ];
      const activePlacement = asset
        ? placements.find(
            (p) => p.side === asset.side && p.wrap === asset.wrap && Math.abs(p.widthPct - width) <= 5
          )
        : undefined;

      return (
        <>
          {/* The pictures themselves, not a dropdown of their filenames.
              Choosing a photograph by its alt text was the "ID dropdown"
              complaint, and fairly: nobody recognises a picture by its
              description of itself. */}
          <span style={{ ...label, display: "block" }}>Picture</span>
          {assets.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#7a5312", background: "#fdf5e6", padding: "8px 11px", margin: "4px 0 8px", lineHeight: 1.5 }}>
              Nothing uploaded yet. Use <strong>Add images</strong> under Pictures at the top,
              then pick it here.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 10px" }}>
              {assets.map((a) => {
                const chosen = a.id === block.assetId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={a.alt || a.caption || "Untitled image"}
                    onClick={() => onChange({ ...block, assetId: a.id })}
                    style={{
                      padding: 0,
                      border: chosen ? "2.5px solid #e8590c" : "1px solid #d8d4cd",
                      background: "none",
                      cursor: "pointer",
                      lineHeight: 0,
                      opacity: chosen ? 1 : 0.85,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.src} alt={a.alt} style={{ width: 76, height: 57, objectFit: "cover", display: "block" }} />
                  </button>
                );
              })}
            </div>
          )}

          {asset ? (
            <>
              <span style={{ ...label, display: "block" }}>How it sits on the page</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 10px" }}>
                {placements.map((p) => {
                  const active = p === activePlacement;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        onAssetPatch(asset.id, { side: p.side, wrap: p.wrap, widthPct: p.widthPct })
                      }
                      style={{
                        ...tinyButton,
                        margin: 0,
                        padding: "7px 11px",
                        border: active ? "1.5px solid #e8590c" : "1px solid #d8d4cd",
                        color: active ? "#a33a05" : "#3d3a36",
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* The size control, on the picture rather than three panels
                  away from it. Continuous rather than a list of steps: the
                  right width for a photograph is the one that looks right
                  beside the text, and nobody knows in advance whether that
                  is 38 or 42 percent. */}
              <label style={{ ...label, marginBottom: 6 }}>
                How wide, {width}% of the column
                <input
                  type="range"
                  min={15}
                  max={100}
                  step={1}
                  value={width}
                  onChange={(e) => onAssetPatch(asset.id, { widthPct: Number(e.target.value) })}
                  style={{ display: "block", width: "100%", marginTop: 6 }}
                />
              </label>

              {/* The caption, on the figure it belongs to. It used to live
                  only under Pictures at the top, a separate screen from the
                  article it appears in, which was most of what made images
                  "a bit tricky". */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{ ...label, flex: "3 1 200px" }}>
                  Caption
                  <input
                    defaultValue={asset.caption ?? ""}
                    onBlur={(e) => onAssetPatch(asset.id, { caption: e.target.value })}
                    placeholder="The line under the picture, giving it context"
                    style={input}
                  />
                </label>
                <label style={{ ...label, flex: "1 1 110px" }}>
                  Set in
                  <select
                    value={asset.captionStyle ?? "regular"}
                    onChange={(e) =>
                      onAssetPatch(asset.id, { captionStyle: e.target.value as Asset["captionStyle"] })
                    }
                    style={input}
                  >
                    <option value="italic">Italic</option>
                    <option value="regular">Regular</option>
                  </select>
                </label>
                <label style={{ ...label, flex: "1 1 130px" }}>
                  Edge
                  <select
                    value={asset.finish ?? "none"}
                    onChange={(e) =>
                      onAssetPatch(asset.id, { finish: e.target.value as Asset["finish"] })
                    }
                    style={input}
                  >
                    <option value="none">Straight to the page</option>
                    <option value="rule">A hairline around it</option>
                    <option value="shadow">A soft shadow</option>
                    <option value="rounded">Rounded corners and a shadow</option>
                    <option value="framed">White border and shadow</option>
                  </select>
                </label>
              </div>
            </>
          ) : null}
        </>
      );
    }

    case "tip":
      return (
        <MarkedText
          content={block.content}
          onChange={(content) => onChange({ ...block, content })}
          rows={3}
          placeholder="Near the bottom of the last page of every article"
          style={input}
        />
      );

    case "writer":
      return (
        <>
          <input
            value={block.name}
            onChange={(e) => onChange({ ...block, name: e.target.value })}
            placeholder="Name"
            style={input}
          />
          <textarea
            value={block.bio?.text ?? ""}
            onChange={(e) => onChange({ ...block, bio: { text: e.target.value } })}
            rows={2}
            placeholder="A line about them"
            style={{ ...input, resize: "vertical" }}
          />
        </>
      );

    case "stats":
      return (
        <>
          {block.cells.map((cell, i) => (
            <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <input
                value={cell.figure}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, figure: e.target.value } : c)),
                  })
                }
                placeholder="60+"
                style={{ ...input, flex: "0 0 90px" }}
              />
              <input
                value={cell.label}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, label: e.target.value } : c)),
                  })
                }
                placeholder="Community partners"
                style={{ ...input, flex: "1 1 140px" }}
              />
              <input
                value={cell.note ?? ""}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, note: e.target.value } : c)),
                  })
                }
                placeholder="A line of detail"
                style={{ ...input, flex: "2 1 180px" }}
              />
            </div>
          ))}
          {block.cells.length < 4 ? (
            <button
              type="button"
              onClick={() => onChange({ ...block, cells: [...block.cells, { figure: "", label: "" }] })}
              style={addButton}
            >
              Add a column
            </button>
          ) : null}
        </>
      );

    case "facts":
      return (
        <>
          {block.cells.map((cell, i) => (
            <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <input
                value={cell.kicker}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, kicker: e.target.value } : c)),
                  })
                }
                placeholder="Label"
                style={{ ...input, flex: "1 1 110px" }}
              />
              <input
                value={cell.word}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, word: e.target.value } : c)),
                  })
                }
                placeholder="The word or number"
                style={{ ...input, flex: "1 1 130px" }}
              />
              <input
                value={cell.note ?? ""}
                onChange={(e) =>
                  onChange({
                    ...block,
                    cells: block.cells.map((c, j) => (j === i ? { ...c, note: e.target.value } : c)),
                  })
                }
                placeholder="A line of detail"
                style={{ ...input, flex: "2 1 160px" }}
              />
            </div>
          ))}
          {block.cells.length < 4 ? (
            <button
              type="button"
              onClick={() => onChange({ ...block, cells: [...block.cells, { kicker: "", word: "" }] })}
              style={addButton}
            >
              Add a column
            </button>
          ) : null}
        </>
      );

    case "rows":
      return <p style={{ fontSize: 13, color: "#6b6864" }}>Rows are built on the list layout.</p>;
  }
}

const panel = {
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  padding: "16px 18px",
  marginBottom: 14,
};

const panelTitle = {
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#c85a1e",
  fontWeight: 700,
  margin: "0 0 12px",
};

const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#4a4744",
  marginBottom: 10,
};

const input = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "8px 10px",
  marginTop: 4,
  fontSize: 14,
  fontFamily: "inherit",
};

const blockCard = {
  border: "1px solid rgba(30,32,32,0.14)",
  borderLeft: "3px solid rgba(30,32,32,0.3)",
  padding: "10px 12px",
  marginBottom: 8,
};

const blockHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
};

const summaryButton = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flex: "1 1 auto",
  minWidth: 0,
  border: 0,
  background: "none",
  padding: 0,
  textAlign: "left" as const,
  cursor: "pointer",
  fontFamily: "inherit",
};

const summaryText = {
  fontSize: 13,
  color: "#5a5754",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const insertRow = {
  display: "flex",
  gap: 5,
  flexWrap: "wrap" as const,
  marginTop: 8,
  paddingTop: 8,
  borderTop: "1px dashed rgba(30,32,32,0.14)",
};

const insertButton = {
  border: "1px solid rgba(30,32,32,0.16)",
  background: "#faf8f6",
  padding: "3px 8px",
  fontSize: 11.5,
  color: "#6b6864",
  cursor: "pointer",
};

const tidyButton = {
  border: 0,
  background: "#0b6e6e",
  color: "#fff",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const tinyButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "3px 8px",
  fontSize: 11.5,
  cursor: "pointer",
};

const addButton = {
  border: "1px solid rgba(30,32,32,0.2)",
  background: "#fff",
  padding: "6px 11px",
  fontSize: 12.5,
  cursor: "pointer",
};

const primaryButton = {
  border: 0,
  background: "#1e2020",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid rgba(30,32,32,0.3)",
  background: "#fff",
  padding: "10px 16px",
  fontSize: 14,
  cursor: "pointer",
};

const approveButton = {
  border: 0,
  background: "#c85a1e",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const notice = { margin: "0 0 10px", padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5 };

const previewLabel = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
  color: "#7a7671",
  margin: "0 0 10px",
};

// Positioned off screen rather than hidden. display:none gives every
// element a height of zero, and visibility:hidden still reserves space in
// the page, so neither can be used for something that has to be laid out
// truthfully but never seen.
const probeWrap = {
  position: "absolute" as const,
  left: -10000,
  top: 0,
  width: "182mm",
  pointerEvents: "none" as const,
};
