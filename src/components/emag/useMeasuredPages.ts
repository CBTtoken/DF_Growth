"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { liveHeightMm, paginate, type Measured } from "@/lib/emag/paginate";
import type { Block, Opener, RenderedPage, SectionLabelBar } from "@/lib/emag/types";
import type { LayoutKey } from "@/lib/emag/publication";

// Measuring an article, once, at its real size.
//
// The trick is a hidden column exactly as wide as a page's live area, with
// the real stylesheet applied. Each block is rendered into it and its
// height read off. Nothing is estimated from character counts, so an
// unusually long word or a photograph with an odd aspect ratio is measured
// rather than guessed at.
//
// The measuring is the part that depends on the browser and the fonts. The
// splitting is pure and lives in lib/emag/paginate. Keeping them apart is
// what makes the result something that can be frozen and replayed rather
// than something that has to be recomputed and hoped about.

const MM_PER_PX = 25.4 / 96;

export type MeasureState = {
  pages: RenderedPage[];
  problems: string[];
  ready: boolean;
  /**
   * The heights themselves, so the co-publisher can work out which picture
   * to shrink rather than measuring the article a second time.
   */
  measured: Measured[];
  /** How much of the first page the masthead and standfirst take. */
  openerHeightMm: number;
  liveHeightMm: number;
};

export function useMeasuredPages(args: {
  head: SectionLabelBar;
  layout: LayoutKey;
  opener: Opener;
  blocks: Block[];
  /** The copyfitting squeeze, so the preview shows it rather than describes it. */
  tighten?: number;
  /** The element holding one rendered copy of every block, in order. */
  probeRef: RefObject<HTMLDivElement | null>;
  /** The element holding a rendered copy of the masthead and standfirst. */
  openerRef: RefObject<HTMLDivElement | null>;
}): MeasureState & { remeasure: () => void } {
  const [state, setState] = useState<MeasureState>({
    pages: [],
    problems: [],
    ready: false,
    measured: [],
    openerHeightMm: 0,
    liveHeightMm: liveHeightMm({}),
  });
  const frame = useRef<number | null>(null);

  const { head, layout, opener, blocks, tighten, probeRef, openerRef } = args;

  const measure = useCallback(() => {
    const probe = probeRef.current;
    if (!probe) return;

    // Every block is rendered as a direct child, in order, so the two lists
    // line up by index. A mismatch means the probe has not caught up with
    // the blocks yet, and measuring now would produce heights for the
    // previous version of the article.
    const children = Array.from(probe.children) as HTMLElement[];
    if (children.length !== blocks.length) return;

    const measured: Measured[] = blocks.map((block, i) => {
      const el = children[i];
      const style = window.getComputedStyle(el);
      // Margins count. The gap under a paragraph is part of what that
      // paragraph costs the page, and ignoring it makes every page one
      // block too long.
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      // Read from what the browser actually did rather than from the
      // asset's settings, so the two can never disagree about whether
      // something is floating.
      const floats = style.cssFloat === "left" || style.cssFloat === "right";
      return {
        block,
        floats,
        heightMm: (el.getBoundingClientRect().height + marginTop + marginBottom) * MM_PER_PX,
      };
    });

    const openerEl = openerRef.current;
    const openerHeightMm = openerEl ? openerEl.getBoundingClientRect().height * MM_PER_PX : 0;

    const result = paginate({
      head,
      layout,
      opener,
      openerHeightMm,
      blocks: measured,
      liveHeightMm: liveHeightMm({}),
      tighten,
    });

    setState({
      pages: result.pages,
      problems: result.problems,
      ready: true,
      measured,
      openerHeightMm,
      liveHeightMm: liveHeightMm({}),
    });
  }, [blocks, head, layout, opener, tighten, openerRef, probeRef]);

  // Measured after paint rather than during render, because heights do not
  // exist until the browser has laid the probe out.
  useLayoutEffect(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [measure]);

  // Images change height when they load, and a page measured before its
  // photograph arrived is measured wrong. This is the single most common
  // way a preview and a published page disagree, so it is watched for
  // explicitly rather than left to a timeout.
  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;

    const images = Array.from(probe.querySelectorAll("img"));
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) return;

    let live = true;
    const onSettled = () => {
      if (live) measure();
    };
    pending.forEach((img) => {
      img.addEventListener("load", onSettled);
      img.addEventListener("error", onSettled);
    });
    return () => {
      live = false;
      pending.forEach((img) => {
        img.removeEventListener("load", onSettled);
        img.removeEventListener("error", onSettled);
      });
    };
  }, [measure, probeRef, blocks]);

  return { ...state, remeasure: measure };
}
