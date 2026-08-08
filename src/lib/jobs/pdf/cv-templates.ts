// The CV template list, client-safe (no react-pdf import): the download
// step renders the picker from this, the PDF and Word renderers map ids
// to skins. Same split as bizup's TEMPLATES const in lib/bizup/pdf/document.tsx.
//
// Five, all free, never gated behind credits or an account (handoff Job
// 3). Names shown to people are Dewald's call, confirmed 8 August 2026.
//
// Every one of the five obeys the same structural rules, which are not
// style choices but the difference between a CV being read and a CV being
// dropped by the software that reads it first:
//
//   single column, real paragraph flow
//   no tables, no text boxes, no floating frames, no sidebars
//   no icons, no graphics, no photos, no charts
//   standard section headings only
//   dates MM/YYYY
//   10 to 12pt body, 0.5 to 1 inch margins
//   maximum two pages
//
// A template that broke any of those would be a template that gets its
// owner filtered out before a person ever sees it, which is a worse
// outcome than a plain-looking CV.

export type CvTemplateId = "plain" | "clean" | "amber" | "compact" | "trades";

export const CV_TEMPLATES: {
  id: CvTemplateId;
  label: string;
  /** One line, plain words, saying who it is for. */
  description: string;
}[] = [
  {
    id: "plain",
    label: "Plain",
    description: "No colour, no lines, nothing. The safest possible document.",
  },
  {
    id: "clean",
    label: "Clean",
    description: "A serif face and more breathing room. Considered, with no decoration.",
  },
  {
    id: "amber",
    label: "Amber",
    description: "Our house look, with an amber band behind your name.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "For a long history. Holds fifteen years on two pages.",
  },
  {
    id: "trades",
    label: "Trades",
    description: "Tickets, licences and skills first, because that is what qualifies you.",
  },
];

export const DEFAULT_CV_TEMPLATE: CvTemplateId = "clean";

export function isCvTemplateId(v: unknown): v is CvTemplateId {
  return v === "plain" || v === "clean" || v === "amber" || v === "compact" || v === "trades";
}

/**
 * The templates recommended for an online application portal.
 *
 * Job 4: big employers read CVs with software before a person sees them.
 * All five survive that software, which is the point of the shared rules
 * above, but Plain and Clean survive the oldest and worst of it too,
 * because neither has a filled background behind any text. Some enterprise
 * parsers still read light text on a filled paragraph as no text at all.
 */
export const PORTAL_SAFE_TEMPLATES: CvTemplateId[] = ["plain", "clean"];
