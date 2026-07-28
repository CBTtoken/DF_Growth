import { ImageResponse } from "next/og";

// The picture WhatsApp, Facebook and LinkedIn show when someone shares
// katisobiz.co.za. Until now they inherited Growth's logo and Growth's
// name, which is the wrong product on the one channel this thing actually
// spreads through.
//
// Generated rather than a static file so it cannot drift from the brand
// colours, and so the wording stays in one place with the page it belongs
// to.
//
// Written with explicit top/left/width/height rather than the `inset`
// shorthand: Satori, which renders this, ignores `inset` silently and the
// element simply lands in the wrong place with no error to notice.

export const runtime = "nodejs";
export const alt = "KatisoBiz: send a quote that wins the job";
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
        {/* A stripe rather than an image: the logo is a PNG that would have
            to be fetched at render time, and a failed fetch would produce a
            blank card on the exact surface that matters most. */}
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
            KatisoBiz
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Send a quote that wins the job.
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
            Professional quotes and invoices from your phone, in under a minute.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#6b7a89" }}>
            katisobiz.co.za
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
    size,
  );
}
