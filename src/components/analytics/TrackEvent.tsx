"use client";

import { useEffect } from "react";

// Fires a single Google Analytics (GA4) event on mount. gtag is installed
// globally in src/app/layout.tsx, so this just pushes an event when a
// conversion/thank-you page renders. Renders nothing. To count these as
// conversions, mark the event name (e.g. "sign_up", "generate_lead") as a
// Key Event in the GA4 dashboard.
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

export function TrackEvent({ name, method }: { name: string; method?: string }) {
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, method ? { method } : {});
    }
  }, [name, method]);

  return null;
}
