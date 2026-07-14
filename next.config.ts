import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Generated social assets and any future uploaded photos/logos live
      // in Supabase Storage — wildcarded so it isn't tied to one project ref.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Stock photography for the Left-Heavy Split landing template
      // (src/lib/images/pexels.ts), searched live by the client's industry.
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  experimental: {
    // Public Beta Polish Sprint Sec 13.11: lets the admin pages call
    // forbidden() from next/navigation to return a real HTTP 403 for
    // unauthenticated/non-allowlisted requests, instead of a 200 response
    // with a "Not available" message body — the previous behavior looked
    // fine in a browser but told any scripted request that /admin exists
    // and is reachable, just gated, which a real 403 doesn't.
    authInterrupts: true,
    serverActions: {
      // Default is 1MB, silently rejecting the whole request before it ever
      // reaches the Server Action — found live twice now: once for a single
      // logo upload (fixed by raising this from 1MB to 3MB), and again for
      // real client photos, which the UI promises can be "under 5MB each"
      // (PhotoGallery.tsx). 3MB didn't leave room for that promise on a
      // single file, let alone the old multi-file-in-one-request upload
      // path (now fixed separately in PhotoUploadInput.tsx to send one
      // file per request, removing the combined-batch-size problem
      // entirely) — this just needs to comfortably clear one photo up to
      // 5MB plus multipart overhead, not raise some general "big upload"
      // ceiling.
      bodySizeLimit: "8mb",
    },
  },
  // Public Beta Polish Sprint Sec 13.9. Confirmed the actual external
  // surface before writing this, rather than guessing: Paystack checkout
  // is a full-page redirect to its own hosted domain (initializePaystackCheckout
  // -> NextResponse.redirect), never embedded here, so it needs zero CSP
  // allowances on this site. Meta Pixel (MetaPixelScript.tsx) is an inline
  // bootstrap script with the pixel ID interpolated directly into its
  // source, which rules out a hash-based script-src (the hash would differ
  // per client) — a nonce-based CSP would need middleware.ts, which this
  // project doesn't have and isn't worth introducing this late just for
  // one inline snippet, so script-src allows 'unsafe-inline' as the
  // pragmatic tradeoff; every other directive still meaningfully narrows
  // the attack surface. style-src needs 'unsafe-inline' too — this app
  // uses inline style={{}} extensively (brand colors, generated social
  // asset rendering) for genuinely dynamic per-client values that can't be
  // known at build time for a static stylesheet. Verified live against
  // Meta Pixel firing, Pexels images loading, and Paystack's redirect
  // completing before this shipped.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.pexels.com https://*.supabase.co https://www.facebook.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.facebook.com https://connect.facebook.net",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
