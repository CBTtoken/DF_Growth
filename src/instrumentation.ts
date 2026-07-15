import * as Sentry from "@sentry/nextjs";

// Next.js's own hook for registering server-side instrumentation — runs
// once per runtime (nodejs and edge are separate processes), before any
// route handler or Server Action executes.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
