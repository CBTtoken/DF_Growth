import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // An escape hatch for building on Dewald's PC only.
  //
  // Windows Application Control blocks Next's native compiler binary there,
  // so the build falls back to WebAssembly, and the WASM path crashes inside
  // the type-checking step with "invalid type: unit value, expected usize".
  // That is a toolchain bug, not a type error: `npx tsc --noEmit` on the same
  // tree passes clean, and CI and Vercel both run the native binary.
  //
  // Off unless DESK_LOCAL_BUILD is set, so nothing about a real build
  // changes. Set it only to produce a local production build for testing.
  typescript: { ignoreBuildErrors: process.env.DESK_LOCAL_BUILD === "1" },

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
      // Rate & Review Sprint 1, Sec 3: Cloudflare Turnstile — real bug
      // found live, the widget script/iframe/verify-callback were all
      // silently blocked by this CSP (confirmed: script tag present in the
      // DOM, but window.turnstile never populated, zero network requests
      // even attempted — the browser drops a CSP-blocked script load
      // before it ever reaches the network layer, no console error either
      // in this case).
      // Google Analytics (gtag.js) — added proactively alongside Turnstile
      // above, same silent-CSP-block risk: gtag.js loads from
      // googletagmanager.com and sends hits to google-analytics.com, both
      // need explicit allow-listing here or the tag silently never fires.
      // 'unsafe-eval' in development only. Next's dev-mode React Refresh
      // runtime evaluates a string, so with this CSP the whole client bundle
      // throws on load and nothing on any page hydrates locally: buttons do
      // nothing, forms fall back to a full page post, and it looks exactly
      // like an app built without JavaScript. Found 2 August 2026 while
      // trying to test The Desk's instant Done and Skip, after the same
      // symptom was misread as a browser problem a day earlier.
      //
      // Never reaches production: NODE_ENV is 'production' in every build
      // Vercel runs, so the deployed header is byte for byte what it was.
      `script-src 'self' 'unsafe-inline'${
        process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
      } https://connect.facebook.net https://challenges.cloudflare.com https://www.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.pexels.com https://*.supabase.co https://www.facebook.com https://www.googletagmanager.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
      "frame-src 'self' https://www.google.com https://challenges.cloudflare.com",
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
  // Standing 365's slug was renamed /standing-365 -> /standing365 (Dewald's
  // own call, easier to type/share). Redirects the old URL rather than
  // letting it 404 outright — it may already be bookmarked or shared
  // somewhere before the rename.
  async redirects() {
    return [
      { source: "/standing-365", destination: "/standing365", permanent: true },
      // Agent Programme Phase 3: "Existing /agents/apply redirects to
      // /agents." The rebuilt /agents carries the same form plus the full
      // disclosure the old page never had, so leaving both live would mean
      // half the applicants seeing a version of the offer that no longer
      // matches the terms. This URL is in the footer, in sent emails, and
      // in whatever the current agents have already shared, so it redirects
      // rather than 404s. Done here rather than as a page component so it
      // is a real 308 at the edge with no render involved.
      { source: "/agents/apply", destination: "/agents", permanent: true },

      // The WordPress site moxiemag.co.za replaces. These URLs are indexed
      // and have been shared, so they redirect rather than 404 when the DNS
      // moves.
      //
      // Every one of them is host-gated, and that is not caution, it is
      // required. /shop is a real Growth page and /product/... could easily
      // become one; an ungated rule here would silently redirect Growth's
      // own shop into a magazine archive on the live site. The `has` host
      // condition is what keeps these rules on Moxie's domain only.
      //
      // www is listed separately because a host condition matches the
      // header exactly and cannot express "with or without www".
      ...["moxiemag.co.za", "www.moxiemag.co.za"].flatMap((host) => {
        const onMoxie = [{ type: "host" as const, value: host }];
        return [
          // The WooCommerce shop and every product page it sold. All three
          // editions it listed are in the new archive, so the archive is
          // the honest destination for each.
          { source: "/shop", destination: "/editions", permanent: true, has: onMoxie },
          { source: "/shop/:path*", destination: "/editions", permanent: true, has: onMoxie },
          { source: "/product/:slug", destination: "/editions", permanent: true, has: onMoxie },
          { source: "/product-category/:slug*", destination: "/editions", permanent: true, has: onMoxie },
          // WooCommerce's customer area. There are no orders to show in the
          // new world, but somebody arriving here is looking for their
          // reading, so they land on their account rather than on a 404.
          { source: "/my-account", destination: "/account", permanent: true, has: onMoxie },
          { source: "/my-account/:path*", destination: "/account", permanent: true, has: onMoxie },
          // The cart and checkout no longer exist as concepts: membership
          // replaced the single-issue sale.
          { source: "/cart", destination: "/subscribe", permanent: true, has: onMoxie },
          { source: "/checkout", destination: "/subscribe", permanent: true, has: onMoxie },
          { source: "/checkout/:path*", destination: "/subscribe", permanent: true, has: onMoxie },
        ];
      }),
    ];
  },
};

// Consolidated Sprint Sec 3.3: wraps every build with Sentry's Next.js
// plugin — safe to ship even before Dewald has created a Sentry account,
// since org/project/authToken are only used for uploading source maps
// (skipped, not a build failure, when unset) and error *reporting* itself
// is controlled purely by the DSN in sentry.server.config.ts /
// instrumentation-client.ts. Once real values exist, add SENTRY_ORG,
// SENTRY_PROJECT, and SENTRY_AUTH_TOKEN in Vercel for readable
// (un-minified) stack traces in the dashboard.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
