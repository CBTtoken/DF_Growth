import * as Sentry from "@sentry/nextjs";

// Edge runtime counterpart to sentry.server.config.ts — this app doesn't
// currently run anything on the edge runtime, but Next.js's instrumentation
// hook expects this file to exist regardless once Sentry is wired in.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
});
