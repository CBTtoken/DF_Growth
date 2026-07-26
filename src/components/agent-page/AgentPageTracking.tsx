"use client";

import { useEffect } from "react";
import { getStoredConsent } from "@/lib/consent";

// Agent Programme Phase 1 Sec 1.9. The DigitalFlyer-own pixel is loaded by
// PixelConsentGate on the page itself (same component, same consent key as
// everywhere else); this only fires events into it, and only once fbq
// actually exists.
//
// Consent is re-read here rather than assumed from the gate rendering:
// nothing may fire for a visitor who rejected, and the two components
// mount independently.

function fireWhenReady(fire: () => void): () => void {
  // fbq is a synchronous queue stub once the base code runs, but the
  // afterInteractive script may not have executed on first paint, so poll
  // briefly for it and fire once. Same approach MetaConversion.tsx uses.
  let tries = 0;
  const id = setInterval(() => {
    if (typeof window.fbq === "function") {
      fire();
      clearInterval(id);
    } else if (++tries > 25) {
      clearInterval(id);
    }
  }, 200);
  return () => clearInterval(id);
}

// Sec 1.9: "ViewContent on agent page load, with the agent slug as the
// content identifier." The slug, not the agent's name or id, so the Meta
// reporting breakdown reads as the same URL Dewald sees everywhere else.
export function AgentPageView({ slug }: { slug: string }) {
  useEffect(() => {
    if (getStoredConsent() !== "accepted") return;
    return fireWhenReady(() =>
      window.fbq?.("track", "ViewContent", {
        content_type: "agent_page",
        content_ids: [slug],
        content_name: slug,
      })
    );
  }, [slug]);

  return null;
}

// Sec 1.9: "Custom event on WhatsApp button click." trackCustom, not track:
// this is not one of Meta's standard events, and sending a made-up name
// through `track` is silently dropped from reporting.
export function trackAgentWhatsAppClick(slug: string) {
  if (getStoredConsent() !== "accepted") return;
  if (typeof window.fbq !== "function") return;
  window.fbq("trackCustom", "AgentWhatsAppClick", { agent_slug: slug });
}
