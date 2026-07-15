import * as Sentry from "@sentry/nextjs";

// Consolidated Sprint Sec 3.3: error monitoring, Node.js runtime (API
// routes, Server Actions, webhook handlers). Silently no-ops if the DSN
// isn't set yet — a free Sentry account + DSN is a real prerequisite here,
// same as every other third-party service this build depends on.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  // Payment/webhook code paths are the highest-value thing to actually see
  // errors from — sampling breadcrumbs/perf data lower than that would be
  // fine, but every real error should always be captured, not sampled.
  environment: process.env.NODE_ENV,
});
