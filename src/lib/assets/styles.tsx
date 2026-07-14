// Shared between the real generation routes (/api/og/testimonial/[id] and
// /api/og/asset) and the style-picker preview route (/api/og/preview/[style])
// so a preview can never drift from what actually gets generated. Every
// element needs an explicit display (flex or none) — next/og's renderer
// (satori) doesn't support implicit block layout the way a real browser does.
export type AssetStyleId = "clean" | "bold-quote" | "star-card" | "mono-badge";

export const ASSET_STYLES: { id: AssetStyleId; name: string; description: string }[] = [
  { id: "clean", name: "Clean", description: "Simple and minimal, your brand colour, italic quote." },
  { id: "bold-quote", name: "Bold Quote", description: "A giant quotation mark carries the design." },
  { id: "star-card", name: "Star Card", description: "A floating white card with your rating up top." },
  { id: "mono-badge", name: "Mono Badge", description: "Clean white background, bold text, a name badge." },
];

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

// A Unicode star glyph (★) renders as a missing-glyph box under next/og's
// edge font (confirmed live: it has no coverage for that character) — a
// real SVG shape always renders regardless of font support.
function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: rating }).map((_, i) => (
        <svg key={i} width="32" height="32" viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l2.9 6.4 7.1.6-5.4 4.6 1.6 6.9L12 16.9 5.8 20.5l1.6-6.9L2 9l7.1-.6L12 2z" />
        </svg>
      ))}
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
          opacity: 0.55,
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
          backgroundColor: "#ffffff",
          padding: "90px",
        }}
      >
        {imageUrl && <ImageBackground imageUrl={imageUrl} tint="#000000" />}
        <div style={{ display: "flex", fontSize: 220, color: primaryColor, lineHeight: 1, opacity: 0.9 }}>&ldquo;</div>
        <div
          style={{
            display: "flex",
            fontSize: 46,
            color: imageUrl ? "#ffffff" : "#0b1220",
            fontWeight: 700,
            lineHeight: 1.25,
            marginTop: -40,
          }}
        >
          {headline}
        </div>
        <div style={{ display: "flex", width: 80, height: 6, backgroundColor: primaryColor, marginTop: 40 }} />
        <div style={{ display: "flex", fontSize: 30, color: primaryColor, fontWeight: 700, marginTop: 24 }}>
          {subtext}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: imageUrl ? "#e5e7eb" : "#6b7280", marginTop: 6 }}>
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
          backgroundColor: primaryColor,
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
            borderRadius: 32,
            padding: "70px 60px",
            width: "100%",
          }}
        >
          {rating ? <Stars rating={rating} color="#f59e0b" /> : null}
          <div
            style={{
              display: "flex",
              fontSize: 40,
              color: "#0b1220",
              textAlign: "center",
              marginTop: 32,
              lineHeight: 1.3,
              fontWeight: 600,
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: primaryColor, fontWeight: 700, marginTop: 36 }}>
            {subtext}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6b7280", marginTop: 4 }}>{businessName}</div>
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
          flexDirection: "column",
          backgroundColor: "#ffffff",
        }}
      >
        {imageUrl && <ImageBackground imageUrl={imageUrl} tint="#000000" />}
        <div style={{ display: "flex", width: "100%", height: 18, backgroundColor: primaryColor }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "90px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: primaryColor,
              color: secondaryColor,
              fontSize: 22,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 999,
              marginBottom: 40,
            }}
          >
            {businessName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              color: imageUrl ? "#ffffff" : "#0b1220",
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: imageUrl ? "#e5e7eb" : "#6b7280", marginTop: 36 }}>
            {subtext}
          </div>
        </div>
      </div>
    );
  }

  // "clean" — the original single design, unchanged.
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
        backgroundColor: primaryColor,
        padding: "80px",
      }}
    >
      {imageUrl && <ImageBackground imageUrl={imageUrl} tint={primaryColor} />}
      <div
        style={{
          position: "relative",
          fontSize: 48,
          color: secondaryColor,
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: "85%",
          display: "flex",
        }}
      >
        &ldquo;{headline}&rdquo;
      </div>
      <div style={{ position: "relative", fontSize: 32, color: secondaryColor, marginTop: 48, opacity: 0.85, display: "flex" }}>
        {subtext}
      </div>
      <div style={{ position: "relative", fontSize: 24, color: secondaryColor, marginTop: 16, opacity: 0.6, display: "flex" }}>
        {businessName}
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
              left: 24,
              top: 24,
              display: "flex",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 999,
            }}
          >
            Before
          </span>
        </div>
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
              right: 24,
              top: 24,
              display: "flex",
              backgroundColor: primaryColor,
              color: secondaryColor,
              fontSize: 26,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 999,
            }}
          >
            After
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "36px 48px" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: secondaryColor }}>{headline}</div>
        <div style={{ display: "flex", fontSize: 22, color: secondaryColor, opacity: 0.8, marginTop: 4 }}>
          {businessName}
        </div>
      </div>
    </div>
  );
}
