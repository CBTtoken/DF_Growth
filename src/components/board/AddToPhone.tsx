"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, Smartphone, X } from "lucide-react";

// "Put this on your phone."
//
// Same reasoning as the KatisoBiz install card, and deliberately a separate
// component rather than a shared one: that card is wired to KatisoBiz's own
// dismissal key and its own copy, and generalising it would mean touching a
// live install flow that already works to make room for this one.
//
// What a phone actually does with it:
//
//   Android, Chrome. beforeinstallprompt fires when Chrome feels like it, so
//   the event is caught at module level and held, and this button triggers
//   the real install when the person is ready.
//
//   iPhone. There is no event and no prompt, ever. Add to Home Screen from
//   the share sheet is the only route, so iPhone users get the three steps
//   written out. It produces exactly the same icon, because on iOS an
//   installed page is a bookmark with an icon and that is all it ever was.
//
// State comes through useSyncExternalStore rather than an effect, because a
// server render has no window and this project's lint rules reject setState
// inside an effect.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let heldPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    heldPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    heldPrompt = null;
    notify();
  });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return heldPrompt !== null;
}

function getServerSnapshot() {
  return false;
}

export function AddToPhone({ appName, dismissKey }: { appName: string; dismissKey: string }) {
  const canPrompt = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const alreadyDismissed =
    typeof window !== "undefined" && window.localStorage.getItem(dismissKey) === "1";

  // Already installed and opened from the home screen: never ask again.
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  if (dismissed || alreadyDismissed || standalone) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Private browsing refuses localStorage. Hiding it for this visit is
      // enough, and nagging on the next one is a small price.
    }
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-brand-blue/20 bg-brand-blue-light p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide this"
        className="absolute right-3 top-3 text-neutral-muted transition-colors hover:text-neutral-ink"
      >
        <X size={15} />
      </button>

      <p className="flex items-center gap-2 pr-6 text-sm font-bold text-neutral-ink">
        <Smartphone size={16} className="text-brand-blue" />
        Put {appName} on your phone
      </p>
      <p className="text-sm text-neutral-mid">
        It gets its own icon and opens full screen, with nothing to download.
      </p>

      {canPrompt ? (
        <button
          type="button"
          onClick={async () => {
            if (!heldPrompt) return;
            await heldPrompt.prompt();
            const choice = await heldPrompt.userChoice;
            if (choice.outcome === "accepted") {
              heldPrompt = null;
              notify();
            }
          }}
          className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
        >
          Add it
        </button>
      ) : showSteps ? (
        <ol className="flex list-decimal flex-col gap-1 pl-4 text-sm text-neutral-mid">
          <li>
            Tap the share button <Share size={13} className="inline align-text-bottom" /> at the bottom of
            Safari.
          </li>
          <li>Scroll down and tap Add to Home Screen.</li>
          <li>Tap Add. The icon appears with your other apps.</li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => setShowSteps(true)}
          className="self-start rounded-full border border-brand-blue/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-white/70"
        >
          Show me how
        </button>
      )}
    </div>
  );
}
