import { ImageResponse } from "next/og";

// The picture WhatsApp, Facebook and LinkedIn show when someone shares a
// DigitalFlyer Growth page.
//
// Site audit, 28 July 2026: Growth's own home page served no share image
// at all, so every share appeared as a bare link. The first fix pointed at
// /brand/logo-blue.png, which turned out to be 1050x330. That is a wide
// banner, not a social card: at roughly 3.2:1 it letterboxes badly against
// the 1.91:1 every platform crops to, and the metadata was declaring
// 1200x630 for it, which was simply untrue.
//
// Generated at the right size instead, mirroring the KatisoBiz card so the
// two products share one approach and neither can drift from its brand
// colours.
//
// Written with explicit top/left/width/height rather than the `inset`
// shorthand: Satori, which renders this, ignores `inset` silently and the
// element lands in the wrong place with no error to notice.

export const runtime = "nodejs";
export const alt = "DigitalFlyer SA: get your business found by local customers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BLUE = "#1081b8";
const ORANGE = "#e8821a";
const INK = "#1c2b3a";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* A stripe rather than the logo PNG: an image would have to be
            fetched at render time, and a failed fetch produces a blank
            card on the one surface where that matters most. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 18, height: 64, backgroundColor: BLUE }} />
          <div style={{ display: "flex", width: 18, height: 64, backgroundColor: ORANGE }} />
          <div
            style={{
              display: "flex",
              marginLeft: 12,
              fontSize: 44,
              fontWeight: 700,
              color: INK,
            }}
          >
            DigitalFlyer SA
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Get your business found by local customers.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 34,
              color: "#4a5b6b",
              lineHeight: 1.3,
            }}
          >
            A professional page, a place on the marketplace, and real reviews.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#6b7a89" }}>
            digitalflyersa.co.za
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: ORANGE,
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              padding: "16px 34px",
              borderRadius: 999,
            }}
          >
            Free to start
          </div>
        </div>
      </div>
    ),
    size
  );
}
