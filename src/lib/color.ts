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

/**
 * A supporting accent, derived from the member's own colour.
 *
 * Dewald, 2026-08-03, looking at the first client page built on a single
 * brand colour: "be careful that her site is not all green it will look
 * terrible and too dark, don't be afraid to match a different colour that
 * will work together across the site."
 *
 * He is right, and a fixed second colour is the wrong fix: it would be
 * chosen to suit one member's green and then clash with the next member's
 * red. So the supporting accent is derived by rotating the hue and warming
 * it, which keeps the relationship rather than the colour. A green primary
 * yields a clay terracotta, a blue yields a warm amber, a red yields a
 * teal. Every one of them is a real complementary pairing rather than a
 * second shade of the same hue.
 *
 * Saturation and lightness are pulled towards a mid, slightly muted range
 * on purpose, so the accent supports rather than competes: an accent as
 * loud as the brand colour just gives a page two brand colours.
 */
export function supportingAccent(hex: string, rotation = 215): string {
  const [h, s, l] = hexToHsl(hex);
  const hue = (h + rotation) % 360;
  // Muted and mid, whatever came in. A near-black brand colour must still
  // produce an accent you can actually see, and a neon one must not produce
  // a second thing shouting.
  //
  // 215 rather than a textbook 180: a straight complement of green is a
  // hard magenta, which is the pairing nobody wants. This lands green on
  // clay, blue on olive gold, red on blue and purple on green, all of which
  // are pairings you would actually choose.
  const sat = Math.min(0.55, Math.max(0.38, s));
  const light = Math.min(0.55, Math.max(0.44, l));
  return hslToHex(hue, sat, light);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255, g = g255 / 255, b = b255 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
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

// Agent page v3: the OG card lays a translucent theme scrim over the
// agent's photo. Satori supports rgba() but not colour-mix or opacity on a
// background, so the alpha has to be baked into the colour string.
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
