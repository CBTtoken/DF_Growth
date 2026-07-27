"use client";

import { useState, useSyncExternalStore } from "react";

// Dewald: "should we not add a button somewhere where they can quickly
// share the platform with someone?"
//
// Worth building, and worth building here rather than on the landing page.
// A tradesman recommending a tool to another tradesman is the single most
// credible marketing this product can get, and it costs nothing. The
// landing page's own footer already carries the free-with-Growth message
// for visitors; this is for members who already like it.
//
// Deliberately plain: no referral code, no reward, no tracking of who
// invited whom. That is a whole programme with its own terms and
// commission logic (the Agent Programme already exists for that), and
// dressing this up as one would create an expectation of payment that does
// not exist. This is "tell your mate", nothing more.

// The address is read from the browser at share time rather than written
// in here. A hardcoded katisobiz.co.za was going out to real people while
// that domain still pointed at the registrar's parking page, so every
// share was a dead link. Reading the live origin means the message always
// names an address that is actually serving, and it needs no code change
// on the day the new domain goes live.
const MESSAGE_PREFIX =
  "I use KatisoBiz for my quotes and invoices. Takes about a minute on your phone and it is free to start. ";

export function ShareBizUp() {
  const [copied, setCopied] = useState(false);

  // The WhatsApp link needs the address in its href at render time, and
  // reading window during render would make the server and the browser
  // produce different HTML, which React treats as a hydration error.
  // useSyncExternalStore is the sanctioned way to read a browser-only
  // value: it takes an explicit server snapshot, so the first render
  // matches on both sides and React swaps in the real value itself. An
  // effect calling setState would do the same job with a cascading
  // re-render, which is what react-hooks/set-state-in-effect objects to.
  const origin = useSyncExternalStore(
    // Never changes within a page's life, so there is nothing to
    // subscribe to and the unsubscribe is a no-op.
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const shareMessage = MESSAGE_PREFIX + origin;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Know someone who needs this?</h2>
      <p className="mt-1 text-sm text-gray-500">
        Most tradesmen still quote on a voice note. Send them this.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
        >
          Share on WhatsApp
        </a>

        <button
          type="button"
          onClick={async () => {
            // navigator.share is what a phone actually wants: it opens the
            // real system sheet with every app the member has. Falls back to
            // the clipboard on desktop, where the API mostly does not exist.
            if (navigator.share) {
              try {
                await navigator.share({ text: shareMessage });
                return;
              } catch {
                // Cancelled the share sheet. Not an error, do nothing.
                return;
              }
            }
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-brand hover:text-brand"
        >
          {copied ? "Copied" : "Share another way"}
        </button>
      </div>
    </section>
  );
}
