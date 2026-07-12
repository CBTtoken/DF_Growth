"use client";

import { useState, useSyncExternalStore } from "react";
import { MetaPixelScript } from "@/components/landing/MetaPixelScript";
import { getStoredConsent, storeConsent, type ConsentStatus } from "@/lib/consent";

// No cross-tab reactivity needed — the only thing that changes this within
// a session is the visitor's own click below (handled via the `override`
// state, not this subscription), so a no-op unsubscribe is correct here.
function subscribe() {
  return () => {};
}

// SSR has no localStorage, so this has to be the server-rendered snapshot —
// useSyncExternalStore then re-reads getStoredConsent() once on the client
// after hydration and re-renders if it differs, with no effect (and no
// setState-in-effect) required.
function getServerSnapshot(): ConsentStatus | null {
  return null;
}

// Combined spec Sec 34: the base Meta Pixel (MetaPixelScript) only ever
// loads after an explicit "Accept" here — never on page load, never on
// "Reject". The banner itself only ever appears when there's a pixel to
// gate at all (no pixelId, e.g. Foundation-tier clients, means this renders
// nothing, same as MetaPixelScript's own null-pixelId behavior). Client
// component because the consent decision only exists in the visitor's own
// localStorage (see lib/consent.ts) — there's nothing to read server-side.
export function PixelConsentGate({ pixelId }: { pixelId: string | null }) {
  const storedConsent = useSyncExternalStore(subscribe, getStoredConsent, getServerSnapshot);
  // Takes precedence over storedConsent the moment the visitor clicks either
  // button this session, without waiting on a localStorage round-trip.
  const [override, setOverride] = useState<ConsentStatus | null>(null);
  const consent = override ?? storedConsent;

  if (!pixelId) return null;

  function handleChoice(status: ConsentStatus) {
    storeConsent(status);
    setOverride(status);
  }

  return (
    <>
      {consent === "accepted" && <MetaPixelScript pixelId={pixelId} />}
      {consent === null && (
        <div
          role="dialog"
          aria-label="Cookie preferences"
          className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-3 border-t border-white/10 bg-ink/95 px-4 py-4 text-center backdrop-blur sm:flex-row sm:justify-between sm:text-left"
        >
          <p className="max-w-2xl text-sm text-white/80">
            This page uses a tracking cookie to measure ad performance. You can accept or reject it —
            either way, the page works exactly the same.
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => handleChoice("rejected")}
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleChoice("accepted")}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/90"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
