import { DESIGN_TOKENS, type DesignSettings } from "@/lib/emag/design";
import { FONT_TARGET, fontByKey, fontValue, type FontRole } from "@/lib/emag/fonts";

// Applies a publication's own design values to every page it renders.
//
// Emitted as a style element rather than an inline style on a wrapper, and
// that is not a stylistic choice. The stylesheet declares the defaults on
// `.mx` itself, so a custom property set on an ancestor loses: `.mx`
// redeclares it and the redeclaration wins for everything inside. A rule
// with the same selector, appearing later in the document, is what actually
// overrides it.
//
// Mounted once in the eMag layout, so the flatplan, the editor's preview,
// the contents page, the published edition and the PDF all read the same
// values without any of them having to know about settings.

function cssValue(unit: string, value: string | number) {
  if (unit === "colour" || unit === "ratio") return String(value);
  return `${value}${unit}`;
}

export function PublicationTheme({ design }: { design: DesignSettings | null | undefined }) {
  if (!design) return null;

  const declarations: string[] = [];

  for (const token of DESIGN_TOKENS) {
    const value = design[token.key];
    if (value === undefined || value === null || value === "") continue;
    declarations.push(`${token.cssVar}:${cssValue(token.unit, value)};`);
  }

  // The margin is one control and two properties, so that a page cannot end
  // up 14mm in on one side and something else on the other.
  if (design.margin !== undefined && design.margin !== "") {
    declarations.push(`--mx-text-l:${design.margin}mm;--mx-text-r:${design.margin}mm;`);
  }

  // The three typefaces. Emitted whenever the publication has chosen one,
  // and an unrecognised choice falls back to the default rather than
  // leaving the page in whatever the browser feels like.
  for (const role of ["display", "body", "label"] as FontRole[]) {
    const chosen = design[`font_${role}`];
    if (!chosen) continue;
    declarations.push(`${FONT_TARGET[role]}:${fontValue(fontByKey(String(chosen), role))};`);
  }

  if (declarations.length === 0) return null;

  return (
    <style
      // The content is built from a fixed list of property names and values
      // that were clamped or hex-checked when they were saved, so there is
      // nothing here a publisher could turn into arbitrary CSS.
      dangerouslySetInnerHTML={{ __html: `.mx{${declarations.join("")}}` }}
    />
  );
}
