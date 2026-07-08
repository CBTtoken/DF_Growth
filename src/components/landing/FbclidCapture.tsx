"use client";

import { useEffect } from "react";

// CLAUDE.md Section 9: capture fbclid from the URL on first visit and store
// it in a short-lived cookie, read back when the lead form submits, since
// it's required to link the eventual conversion back to the ad click. This
// has to run client-side — Server Components can only set cookies inside a
// Server Action or Route Handler, not while rendering a page.
export function FbclidCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");
    if (!fbclid) return;

    const maxAgeSeconds = 90 * 24 * 60 * 60;
    document.cookie = `fbclid=${fbclid}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  }, []);

  return null;
}
