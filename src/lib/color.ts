// Every client picks their own brand color via the wizard's color picker —
// this template has to look considered for whatever hex they land on, not
// just the handful of colors we might think to test. Deriving tints/shades
// at render time means one hero design works for a soft pastel and a
// saturated primary alike, instead of a fixed palette that only really
// suits one kind of color.
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

// Simple relative luminance check to decide whether white or near-black
// text reads better against a given background color.
export function readableTextOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b1220" : "#ffffff";
}

// WCAG relative luminance / contrast ratio — more rigorous than the simple
// weighted-average used by readableTextOn() above, needed here because
// we're checking an arbitrary client color against another arbitrary
// color (not picking between two fixed options), so a cruder heuristic
// isn't precise enough to know when it's actually failed.
function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Only the hero was ever built with contrast-safety (readableTextOn, above,
// picking white/near-black text against the client's own color used as a
// BACKGROUND). Every other section uses the client's raw color as small
// TEXT/icon color on a light card — found live during testing that a
// bright, light client color (e.g. #fbff0a) is then nearly invisible on
// white, since nothing was ever checking that case. This darkens or
// lightens the given color just enough to clear a real WCAG AA ratio
// against whatever it's actually rendered on, leaving already-readable
// colors untouched.
//
// Tries both directions rather than guessing one from the background's
// luminance — found live that a naive "background luminance > 0.5 means
// light, so darken the text" rule picks the wrong direction for backgrounds
// like #a8a3a3 (a medium gray whose WCAG *relative* luminance, ~0.38, is
// well below the 0.5 that its visual brightness would suggest — WCAG
// luminance isn't on the same scale as perceived brightness). Just
// measuring which direction actually clears the ratio is the only
// approach that isn't guessing.
export function ensureContrast(hex: string, background: string, minRatio = 4.5): string {
  if (contrastRatio(hex, background) >= minRatio) return hex;

  let best = hex;
  let bestRatio = contrastRatio(hex, background);

  for (const direction of [-1, 1]) {
    for (let amount = 0.1; amount <= 1; amount += 0.1) {
      const candidate = shade(hex, direction * amount);
      const ratio = contrastRatio(candidate, background);
      if (ratio >= minRatio) return candidate;
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }
  return best;
}
