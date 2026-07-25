"use client";

import Script from "next/script";
import { useEffect } from "react";
import { getStoredConsent } from "@/lib/consent";

// The DigitalFlyer-own Meta Pixel (same NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID
// that MarketingHeader loads on the marketing pages). The signup thank-you
// pages use BrandHeader, not MarketingHeader, so the pixel isn't otherwise
// present here — this loads it and fires a standard conversion event so Meta
// has something to optimise the ad campaign toward.
//
// Consent-gated on the same df_pixel_consent (lib/consent.ts) as every other
// pixel load: nothing fires unless the visitor accepted cookies and the pixel
// env var is set. Server-side CAPI (added separately) is the reliable backup
// for the visitors this client-side path misses.
const PIXEL = process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function MetaConversion({ event, eventId }: { event: string; eventId?: string }) {
  const consent = typeof window === "undefined" ? null : getStoredConsent();
  const active = Boolean(PIXEL) && consent === "accepted";

  useEffect(() => {
    if (!active) return;
    // fbq is a synchronous queue stub once the base code runs, but the
    // afterInteractive script may not have executed yet on first paint, so
    // poll briefly for it and fire once available.
    let tries = 0;
    const id = setInterval(() => {
      if (typeof window.fbq === "function") {
        // Pass the SAME event_id the server-side CAPI used for this signup
        // (threaded in via the thank-you page's ?ev= param) so Meta dedupes
        // the browser + server events into one conversion. Without an id
        // there's nothing to dedupe against and a signup could be counted
        // twice once CAPI is live.
        if (eventId) {
          window.fbq("track", event, {}, { eventID: eventId });
        } else {
          window.fbq("track", event);
        }
        clearInterval(id);
      } else if (++tries > 25) {
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [active, event, eventId]);

  if (!active) return null;

  return (
    <Script id="df-meta-pixel-conversion" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${PIXEL}');
        fbq('track','PageView');
      `}
    </Script>
  );
}
