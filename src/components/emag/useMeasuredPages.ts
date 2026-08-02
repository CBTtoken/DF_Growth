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

/**
 * The page's own geometry, read from the page rather than assumed.
 *
 * This closed a fault that was invisible for as long as nobody used the
 * feature that triggers it. The footer height and the top rule are editable
 * on the Settings screen, but pagination called liveHeightMm({}) with no
 * arguments, so it always assumed the 10mm footer and 4mm rule from the
 * stylesheet. Change either one and every article in the publication runs
 * over by exactly that difference, on every page, with no warning anywhere.
 * Moxie has no overrides saved yet, which is the only reason it never
 * showed.
 *
 * Threading the design values down through props would have worked and
 * would have been the wrong fix. A hand-written list of fields has already
 * caused two defects in this build, both times because somebody added a
 * setting and did not add it to the list. The values are declared once, as
 * custom properties, and the browser has already resolved them.
 *
 * Measured rather than parsed. A custom property comes back as the token as
 * written, "10mm" today and possibly "38px" or "1cm" after somebody edits a
 * unit in design.ts, and a parser that understands only millimetres would
 * fail silently in exactly the same way this fix exists to prevent. Giving
 * a probe the height and asking how tall it got is unit-proof.
 */
function readPageGeometry(host: HTMLElement) {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  host.appendChild(probe);

  const mm = (cssVar: string, fallbackMm: number) => {
    probe.style.height = `var(${cssVar})`;
    const px = probe.getBoundingClientRect().height;
    // An unknown variable leaves the height unset, which reads as zero. The
    // stylesheet default is a better answer than a page of no height.
    return px > 0 ? px * MM_PER_PX : fallbackMm;
  };

  const geometry = {
    pageHeightMm: mm("--mx-page-h", 297),
    topRuleMm: mm("--mx-topbar-h", 4),
    labelBarMm: mm("--mx-head-h", 6),
    footerMm: mm("--mx-foot-h", 10),
    bodyTopMm: mm("--mx-body-top", 2),
  };

  host.removeChild(probe);
  return geometry;
}

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

    // What a block costs the page is how far it pushes the next block down,
    // not how tall its own box is.
    //
    // Those are not the same number, and the difference is not small. The
    // old version added the element's own computed marginTop and
    // marginBottom to its height, which sounds like the same thing and is
    // wrong twice over. Adjacent margins collapse, so adding both
    // over-counts the gap between two paragraphs. And a margin set on an
    // element's inner child collapses out through it, so the outer element
    // reports margin zero while really pushing everything below it down.
    //
    // Dewald's Editor's Letter, 1 August 2026, is the case that found it.
    // Its pull quote measured 7.01mm and actually occupied 13.16mm, because
    // its 4mm of breathing room lives on a child. Six millimetres vanished
    // from an article the paginator then declared would fit on one page,
    // and the last lines slid under the footer. The 4mm safety margin could
    // not absorb a 6mm lie.
    //
    // Measuring the advance instead means the browser reports the spacing
    // rather than this file trying to predict it. Collapsing, inner
    // margins, and whatever the next block type does about its own spacing
    // are all included for free, because they have already happened by the
    // time the tape measure comes out.
    const rects = children.map((el) => el.getBoundingClientRect());
    const isFloat = children.map((el) => {
      // Read from what the browser actually did rather than from the
      // asset's settings, so the two can never disagree about whether
      // something is floating.
      const f = window.getComputedStyle(el).cssFloat;
      return f === "left" || f === "right";
    });
    const measured: Measured[] = blocks.map((block, i) => {
      // A floated picture is out of the flow: it advances nothing, so the
      // advance would read as zero. Its own box is what matters, because
      // the paginator tracks where its bottom edge falls.
      if (isFloat[i]) {
        const style = window.getComputedStyle(children[i]);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        return {
          block,
          floats: true,
          heightMm: (rects[i].height + marginTop + marginBottom) * MM_PER_PX,
        };
      }

      // The next block that actually sits in the flow. Floats are stepped
      // over rather than measured to, since they take no flow height and
      // the space they appear to occupy belongs to the text beside them.
      let next = -1;
      for (let j = i + 1; j < children.length; j++) {
        if (!isFloat[j]) {
          next = j;
          break;
        }
      }

      // Nothing follows, so nothing is being pushed anywhere. Its own box
      // is the honest answer: a trailing margin under the last block is
      // space at the end of the article, which costs the page nothing.
      const heightPx =
        next === -1 ? rects[i].height : rects[next].top - rects[i].top;

      return { block, floats: false, heightMm: heightPx * MM_PER_PX };
    });


    const openerEl = openerRef.current;
    const openerHeightMm = openerEl ? openerEl.getBoundingClientRect().height * MM_PER_PX : 0;

    // The live area, from this publication's own geometry rather than from
    // the stylesheet defaults. See readPageGeometry.
    const liveMm = liveHeightMm(readPageGeometry(probe));

    const result = paginate({
      head,
      layout,
      opener,
      openerHeightMm,
      blocks: measured,
      liveHeightMm: liveMm,
      tighten,
    });

    // Does the sum of the parts equal the whole?
    //
    // The heights above are the only thing standing between an article and
    // text sliding under the footer, and until 1 August 2026 nothing checked
    // them against anything. A pull quote that under-measured by six
    // millimetres went unnoticed all the way to Dewald's screen.
    //
    // The probe already knows the right answer: it is one column, and its
    // own height is what the blocks really occupy. So the measurements are
    // asked to agree with it. If they ever drift apart again this says so
    // in the same place every other layout problem is reported, instead of
    // waiting to be discovered as a symptom two steps downstream.
    //
    // Skipped when a picture floats, where the column's height and the flow
    // height are legitimately different numbers.
    const problems = [...result.problems];
    if (!isFloat.some(Boolean) && children.length > 0) {
      const columnMm = probe.getBoundingClientRect().height * MM_PER_PX;
      const sumMm = measured.reduce((total, m) => total + m.heightMm, 0);
      if (Math.abs(columnMm - sumMm) > 1) {
        problems.push(
          `The page measurements do not add up: the blocks measure ${sumMm.toFixed(
            1
          )}mm but occupy ${columnMm.toFixed(
            1
          )}mm. The page breaks below may be wrong. This is a fault in the builder, not in the article.`
        );
      }
    }

    setState({
      pages: result.pages,
      problems,
      ready: true,
      measured,
      openerHeightMm,
      liveHeightMm: liveMm,
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
