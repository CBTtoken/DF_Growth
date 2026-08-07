// The CV template list, client-safe (no react-pdf import): the review
// screen renders the picker from this, the PDF renderer maps ids to skins.
// Same split as bizup's TEMPLATES const in lib/bizup/pdf/document.tsx.

export type CvTemplateId = "clean" | "bold" | "compact";

export const CV_TEMPLATES: { id: CvTemplateId; label: string; description: string }[] = [
  { id: "clean", label: "Clean", description: "Plain and easy to read. Prints well on anything." },
  { id: "bold", label: "Bold", description: "A strong header band. Stands out in a stack of CVs." },
  { id: "compact", label: "Compact", description: "Tighter layout, fits more on one page." },
];

export function isCvTemplateId(v: unknown): v is CvTemplateId {
  return v === "clean" || v === "bold" || v === "compact";
}
