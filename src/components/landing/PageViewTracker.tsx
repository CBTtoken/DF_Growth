"use client";

import { useEffect } from "react";

// Fires once per real page load, after paint — a fetch with keepalive
// (survives the tab closing/navigating away mid-request, same guarantee
// sendBeacon gives, without sendBeacon's stricter same-payload-shape
// limitations). No loading state, no visible UI, nothing to await:
// genuinely fire-and-forget, matching "written asynchronously so it never
// slows page render."
export function PageViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {
      // A dropped page-view count is never worth surfacing to a visitor.
    });
  }, [slug]);

  return null;
}
