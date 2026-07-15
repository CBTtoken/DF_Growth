import * as Sentry from "@sentry/nextjs";

// Consolidated Sprint Sec 3.3: browser-side error capture — a real prospect
// or client hitting a JS error on the pricing page or dashboard was
// previously invisible entirely; this surfaces it in Sentry alongside the
// server-side errors from sentry.server.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
});
