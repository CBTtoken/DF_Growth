// Shared between the real generation route (/api/og/testimonial/[id]) and
// the style-picker preview route (/api/og/preview/[style]) so a preview
// can never drift from what actually gets generated. Every element needs
// an explicit display (flex or none) — next/og's renderer (satori) doesn't
// support implicit block layout the way a real browser does.
export type AssetStyleId = "clean" | "bold-quote" | "star-card" | "mono-badge";

export const ASSET_STYLES: { id: AssetStyleId; name: string; description: string }[] = [
  { id: "clean", name: "Clean", description: "Simple and minimal, your brand colour, italic quote." },
  { id: "bold-quote", name: "Bold Quote", description: "A giant quotation mark carries the design." },
  { id: "star-card", name: "Star Card", description: "A floating white card with your rating up top." },
  { id: "mono-badge", name: "Mono Badge", description: "Clean white background, bold text, a name badge." },
];

export type CardData = {
  quote: string;
  authorName: string;
  businessName: string;
  rating: number | null;
  primaryColor: string;
  secondaryColor: string;
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

export function renderCard(style: AssetStyleId, data: CardData) {
  const { quote, authorName, businessName, rating, primaryColor, secondaryColor } = data;

  if (style === "bold-quote") {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "90px",
        }}
      >
        <div style={{ display: "flex", fontSize: 220, color: primaryColor, lineHeight: 1, opacity: 0.9 }}>&ldquo;</div>
        <div style={{ display: "flex", fontSize: 46, color: "#0b1220", fontWeight: 700, lineHeight: 1.25, marginTop: -40 }}>
          {quote}
        </div>
        <div style={{ display: "flex", width: 80, height: 6, backgroundColor: primaryColor, marginTop: 40 }} />
        <div style={{ display: "flex", fontSize: 30, color: primaryColor, fontWeight: 700, marginTop: 24 }}>
          {authorName}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#6b7280", marginTop: 6 }}>{businessName}</div>
      </div>
    );
  }

  if (style === "star-card") {
    return (
      <div
        style={{
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
        <div
          style={{
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
            {quote}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: primaryColor, fontWeight: 700, marginTop: 36 }}>
            {authorName}
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
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        }}
      >
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
          <div style={{ display: "flex", fontSize: 48, color: "#0b1220", fontWeight: 800, lineHeight: 1.25 }}>
            {quote}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#6b7280", marginTop: 36 }}>{authorName}</div>
        </div>
      </div>
    );
  }

  // "clean" — the original single design, unchanged.
  return (
    <div
      style={{
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
      <div
        style={{
          fontSize: 48,
          color: secondaryColor,
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: "85%",
          display: "flex",
        }}
      >
        &ldquo;{quote}&rdquo;
      </div>
      <div style={{ fontSize: 32, color: secondaryColor, marginTop: 48, opacity: 0.85, display: "flex" }}>
        {authorName}
      </div>
      <div style={{ fontSize: 24, color: secondaryColor, marginTop: 16, opacity: 0.6, display: "flex" }}>
        {businessName}
      </div>
    </div>
  );
}
