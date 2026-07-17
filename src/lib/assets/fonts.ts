// Vercel's own documented pattern for loading a real Google Font into
// Satori/next/og (there's no other supported way to get a font's binary
// data into ImageResponse on edge runtime) — the CSS endpoint doesn't
// return the font file itself, so this fetches the CSS, extracts the
// actual .ttf URL Google serves for that weight, then fetches that.
// Root cause of the "looks like MS Word" complaint: every generated asset
// was rendering with Satori's bare fallback font, since no `fonts` array
// was ever being passed to ImageResponse — this fixes that at the source
// rather than trying to fix it with layout tweaks alone.
async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`Could not resolve font file for ${family} ${weight}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

// Barlow Condensed Bold carries every headline — the same face already
// used platform-wide for the "GROWTH" wordmark badge (src/app/layout.tsx),
// so a generated asset shares real typographic identity with the site
// instead of introducing a third, unrelated look. Geist carries body text,
// same reasoning. Both fetched fresh per render rather than bundled as
// static files — simpler, no build-step asset pipeline needed, and this
// only runs on-demand when a client generates an asset, not on every page
// view, so the extra ~200-400ms is a fair trade for genuinely fixing the
// typography instead of shipping default-font output indefinitely.
export async function loadAssetFonts() {
  const [barlowBold, geistRegular, geistBold] = await Promise.all([
    loadGoogleFont("Barlow Condensed", 700),
    loadGoogleFont("Geist", 400),
    loadGoogleFont("Geist", 700),
  ]);

  return [
    { name: "Barlow Condensed", data: barlowBold, weight: 700 as const, style: "normal" as const },
    { name: "Geist", data: geistRegular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: geistBold, weight: 700 as const, style: "normal" as const },
  ];
}
