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
    // Real bug found live, second time: this CSP set no frame-src at all,
    // which falls back to default-src 'self' — silently blocking every
    // client page's LocationMap Google Maps embed (components/landing/
    // LocationMap.tsx) sitewide since this shipped. Confirmed live: zero
    // network activity toward google.com when a client page with a real
    // address loads, not even a blocked-request entry, just nothing.
    // frame-ancestors (who can frame US) and frame-src (what WE can frame)
    // are different directions entirely — the earlier /sample fix only
    // ever touched the former, so it couldn't have caught this.
    const cspDirectives = (frameAncestors: string) => [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.pexels.com https://*.supabase.co https://www.facebook.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.facebook.com https://connect.facebook.net",
      "frame-src 'self' https://www.google.com",
      `frame-ancestors ${frameAncestors}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const sharedHeaders = (csp: string, frameOptions: string) => [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: frameOptions },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];

    return [
      {
        source: "/:path*",
        headers: sharedHeaders(cspDirectives("'none'"), "DENY"),
      },
      // Real bug found live: the pricing page's "See It In Action" section
      // embeds /sample/[slug] in same-origin <iframe>s (Sec 36) — the
      // blanket frame-ancestors 'none' / X-Frame-Options: DENY above
      // blocks a page from framing itself just as much as it blocks any
      // other site, so every one of those previews failed to load
      // (confirmed live: net::ERR_BLOCKED_BY_RESPONSE on each). Next.js
      // applies the last matching header for a given key when multiple
      // entries match the same path, so this narrower, later rule only
      // loosens framing for the sample pages specifically — every other
      // route keeps the strict 'none'/DENY clickjacking protection above.
      {
        source: "/sample/:path*",
        headers: sharedHeaders(cspDirectives("'self'"), "SAMEORIGIN"),
      },
      // Same exact issue, a second place: the onboarding wizard's template
      // picker (components/templates/TemplateGallery.tsx, used by both
      // Step4TemplatePicker and the dashboard's "Change template") embeds
      // /preview/[templateId] in a same-origin <iframe> the identical way
      // — confirmed live via the CSP headers on that route directly. Missed
      // the first time because the fix only covered the one place it was
      // reported (/sample), not every same-origin <iframe> in the app —
      // grepped for every <iframe> usage this time before considering it
      // done (three total: this one, /sample, and LocationMap's Google Maps
      // embed, fixed above via frame-src instead since that one frames an
      // external site, not itself).
      {
        source: "/preview/:path*",
        headers: sharedHeaders(cspDirectives("'self'"), "SAMEORIGIN"),
      },
    ];
  },
};

export default nextConfig;
