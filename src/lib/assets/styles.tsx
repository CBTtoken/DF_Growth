// Shared between the real generation routes (/api/og/testimonial/[id] and
// /api/og/asset) and the style-picker preview route (/api/og/preview/[style])
// so a preview can never drift from what actually gets generated. Every
// element needs an explicit display (flex or none) — next/og's renderer
// (satori) doesn't support implicit block layout the way a real browser does.
export type AssetStyleId = "clean" | "bold-quote" | "star-card" | "mono-badge";

export const ASSET_STYLES: { id: AssetStyleId; name: string; description: string }[] = [
  { id: "clean", name: "Clean", description: "Gradient hero card, bold headline, your brand colour." },
  { id: "bold-quote", name: "Bold Quote", description: "A huge gradient quotation mark carries the design." },
  { id: "star-card", name: "Star Card", description: "A floating white card with your rating up top." },
  { id: "mono-badge", name: "Mono Badge", description: "Split colour block with a bold name badge." },
];

// Design pass, 2026-07-17: Dewald's exact complaint — generated assets
// "looked like MS Word or Paint" — traced to two real causes, both fixed
// here and in src/lib/assets/fonts.ts, not just layout tweaks:
//   1. No custom font was ever passed to ImageResponse anywhere in this
//      codebase, so every asset silently rendered in Satori's bare
//      fallback font. Headlines now use Barlow Condensed Bold (the same
//      face the platform itself uses for its own wordmark), body text
//      uses Geist — real typographic identity, not a default.
//   2. Every background was a flat, single flood-fill colour with text
//      dropped on top — no depth, no hierarchy device, nothing a real
//      designer would call a layout decision. Replaced with gradients,
//      soft shadows, decorative oversized glyphs, and consistent
//      eyebrow/accent-rule structure across every style below.
// Deliberately no DigitalFlyer branding anywhere in the output — this
// represents the CLIENT's business on their own social feed, not ours.

// Combined spec Sec 25: generalized from the original testimonial-only
// shape (quote/authorName) to headline/subtext, generic enough for a
// special offer, announcement, or new-arrival spotlight too — a
// testimonial just maps quote->headline, authorName->subtext, same as
// before. rating stays testimonial-specific (null for every other content
// type). imageUrl is new: when set, every style renders it as a full-bleed
// background with a brand-color scrim over it instead of a flat color, so
// the client's own photo (or one they picked via Pexels/their gallery)
// carries the design instead of just brand color alone.
export type CardData = {
  headline: string;
  subtext: string;
  businessName: string;
  rating: number | null;
  primaryColor: string;
  secondaryColor: string;
  imageUrl?: string | null;
};

// Cheap multiplicative darken, no colour-library dependency — good enough
// to turn a single brand hex into a believable gradient partner without
// asking the client for a second colour they don't have.
function shade(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// A Unicode star glyph (★) renders as a missing-glyph box under next/og's
// edge font (confirmed live: it has no coverage for that character) — a
// real SVG shape always renders regardless of font support.
function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: rating }).map((_, i) => (
        <svg key={i} width="30" height="30" viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l2.9 6.4 7.1.6-5.4 4.6 1.6 6.9L12 16.9 5.8 20.5l1.6-6.9L2 9l7.1-.6L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// Small uppercase kicker label — the one repeated device that gives every
// style a real editorial structure (eyebrow -> headline -> accent rule ->
// attribution) instead of text just being centered and hoped for.
function Eyebrow({ children, color }: { children: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Geist",
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  );
}

// The image + scrim background layer shared by every style below — an
// absolutely-positioned pair (photo, then a tinted overlay in the
// client's own primary color for text legibility) sitting behind the
// style's normal content, only rendered when imageUrl is present.
//
// Public Beta Polish Sprint Sec 9: root cause of the reported bug, found by
// bisecting down to a minimal repro — two independent, both fully silent
// Satori (next/og) rendering gaps stacked on top of each other here:
// (1) a plain <img src="..."> element never rendered anything at all in
// this project's next/og setup, confirmed byte-for-byte identical output
// whether or not a real image URL was supplied, even with a data URI in
// place of a remote fetch — fixed by using a CSS backgroundImage on a div
// instead, which does render correctly; (2) the `inset: 0` shorthand
// doesn't work in Satori either — a `position: "absolute", inset: 0` div
// silently collapses to zero effective size instead of erroring, hiding
// anything inside it (including a working backgroundImage) — fixed by
// spelling out top/left/right/bottom: 0 instead of the shorthand.
function ImageBackground({ imageUrl, tint }: { imageUrl: string; tint: string }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundColor: tint,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

export function renderCard(style: AssetStyleId, data: CardData) {
  const { headline, subtext, businessName, rating, primaryColor, secondaryColor, imageUrl } = data;

  if (style === "bold-quote") {
    return (
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          padding: "100px 90px",
        }}
      >
        {imageUrl && <ImageBackground imageUrl={imageUrl} tint="#000000" />}
        {/* Angled colour block anchoring one corner — the "designed"
            device this style was missing entirely before, not just a
            flood-filled background. */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${shade(primaryColor, 0.6)} 100%)`,
            top: -260,
            right: -260,
            opacity: 0.14,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontWeight: 700,
            fontSize: 260,
            color: primaryColor,
            lineHeight: 1,
            opacity: 0.16,
            position: "absolute",
            top: 30,
            left: 70,
          }}
        >
          &ldquo;
        </div>
        <Eyebrow color={primaryColor}>Customer Review</Eyebrow>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontWeight: 700,
            fontSize: 64,
            color: imageUrl ? "#ffffff" : "#0b1220",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            marginTop: 20,
          }}
        >
          {headline}
        </div>
        <div style={{ display: "flex", width: 90, height: 8, borderRadius: 4, backgroundColor: primaryColor, marginTop: 44 }} />
        <div
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontWeight: 700,
            fontSize: 30,
            color: primaryColor,
            marginTop: 26,
          }}
        >
          {subtext}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontWeight: 400,
            fontSize: 24,
            color: imageUrl ? "#e5e7eb" : "#6b7280",
            marginTop: 6,
          }}
        >
          {businessName}
        </div>
      </div>
    );
  }

  if (style === "star-card") {
    return (
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(160deg, ${primaryColor} 0%, ${shade(primaryColor, 0.55)} 100%)`,
          padding: "70px",
        }}
      >
        {imageUrl && <ImageBackground imageUrl={imageUrl} tint={primaryColor} />}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: 36,
            padding: "72px 60px",
            width: "100%",
            boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
          }}
        >
          {rating ? <Stars rating={rating} color="#f59e0b" /> : null}
          <div style={{ display: "flex", width: 56, height: 5, borderRadius: 3, backgroundColor: primaryColor, marginTop: 28, opacity: 0.5 }} />
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontWeight: 700,
              fontSize: 50,
              color: "#0b1220",
              textAlign: "center",
              marginTop: 32,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontFamily: "Geist", fontWeight: 700, fontSize: 28, color: primaryColor, marginTop: 34 }}>
            {subtext}
          </div>
          <div style={{ display: "flex", fontFamily: "Geist", fontWeight: 400, fontSize: 22, color: "#6b7280", marginTop: 4 }}>
            {businessName}
          </div>
        </div>
      </div>
    );
  }

  if (style === "mono-badge") {
    return (
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: "#ffffff",
        }}
      >
        {imageUrl && <ImageBackground imageUrl={imageUrl} tint="#000000" />}
        {/* Split-composition colour block, not a thin flat top bar — a
            real editorial layout move, and it's where the business name
            badge now lives instead of floating loose in the text column. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 340,
            flexShrink: 0,
            background: `linear-gradient(200deg, ${primaryColor} 0%, ${shade(primaryColor, 0.6)} 100%)`,
            padding: "60px 44px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: secondaryColor,
              color: primaryColor,
              fontFamily: "Geist",
              fontSize: 22,
              fontWeight: 700,
              padding: "12px 24px",
              borderRadius: 999,
              boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
            }}
          >
            {businessName}
          </div>
          {rating ? <Stars rating={rating} color={secondaryColor} /> : <div style={{ display: "flex" }} />}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "90px 80px",
          }}
        >
          <Eyebrow color={imageUrl ? "#e5e7eb" : primaryColor}>{subtext}</Eyebrow>
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontWeight: 700,
              fontSize: 58,
              color: imageUrl ? "#ffffff" : "#0b1220",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              marginTop: 18,
            }}
          >
            {headline}
          </div>
        </div>
      </div>
    );
  }

  // "clean" — gradient hero card, the default style, now a real one.
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${shade(primaryColor, 0.6)} 100%)`,
        padding: "100px",
        overflow: "hidden",
      }}
    >
      {imageUrl && <ImageBackground imageUrl={imageUrl} tint={primaryColor} />}
      <div
        style={{
          display: "flex",
          fontFamily: "Barlow Condensed",
          fontWeight: 700,
          fontSize: 320,
          color: secondaryColor,
          lineHeight: 1,
          opacity: 0.12,
          position: "absolute",
          top: -40,
          left: -20,
        }}
      >
        &ldquo;
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
        <Eyebrow color={secondaryColor}>{businessName}</Eyebrow>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontWeight: 700,
            fontSize: 58,
            color: secondaryColor,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            marginTop: 22,
            maxWidth: "88%",
          }}
        >
          {headline}
        </div>
        <div
          style={{
            display: "flex",
            width: 90,
            height: 6,
            borderRadius: 3,
            backgroundColor: secondaryColor,
            opacity: 0.7,
            marginTop: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontWeight: 400,
            fontSize: 28,
            color: secondaryColor,
            opacity: 0.85,
            marginTop: 22,
          }}
        >
          {subtext}
        </div>
      </div>
    </div>
  );
}

// Combined spec Sec 25 item 1: Before & After needs two photos side by
// side, structurally different from every other style's single-block
// layout — rather than forcing it into the 4 existing styles (which would
// mean redesigning all 4 twice over), it gets one dedicated layout that
// still uses the client's own brand color, no separate style choice.
export function renderBeforeAfter({
  beforeImageUrl,
  afterImageUrl,
  businessName,
  headline,
  primaryColor,
  secondaryColor,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  businessName: string;
  headline: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: primaryColor,
      }}
    >
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ position: "relative", display: "flex", flex: 1 }}>
          {/* Public Beta Polish Sprint Sec 9: <img> silently failed to
              render here too — see ImageBackground's comment above. */}
          <div
            style={{
              display: "flex",
              flex: 1,
              backgroundImage: `url(${beforeImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 28,
              top: 28,
              display: "flex",
              fontFamily: "Geist",
              backgroundColor: "rgba(0,0,0,0.65)",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "10px 22px",
              borderRadius: 999,
            }}
          >
            Before
          </span>
        </div>
        <div style={{ display: "flex", width: 6, backgroundColor: secondaryColor }} />
        <div style={{ position: "relative", display: "flex", flex: 1 }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              backgroundImage: `url(${afterImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 28,
              top: 28,
              display: "flex",
              fontFamily: "Geist",
              backgroundColor: secondaryColor,
              color: primaryColor,
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "10px 22px",
              borderRadius: 999,
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
          >
            After
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "40px 52px" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontWeight: 700,
            fontSize: 40,
            color: secondaryColor,
            letterSpacing: "-0.01em",
          }}
        >
          {headline}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontWeight: 400,
            fontSize: 22,
            color: secondaryColor,
            opacity: 0.8,
            marginTop: 6,
          }}
        >
          {businessName}
        </div>
      </div>
    </div>
  );
}
