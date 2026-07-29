"use client";

import { useState, useSyncExternalStore } from "react";

// "Put KatisoBiz on your phone."
//
// Why this is a component we control rather than something left to the
// browser: the browser is not reliable about offering it.
//
// On Android, Chrome fires beforeinstallprompt only when it decides the
// visitor is engaged enough. Sometimes that is a small bar at the bottom,
// sometimes nothing at all, and a first-time visitor who bounces sees
// neither. So the event is captured and held, and a button of ours triggers
// the real install when the member is ready.
//
// On iPhone there is no prompt and no event at all. Apple does not allow
// it. The only route is Safari, Share, Add to Home Screen, which nobody
// discovers unaided, so iPhone users get written steps instead. That is the
// only honest option rather than a limitation worth hiding.
//
// State is read through useSyncExternalStore rather than an effect, the
// same approach PixelConsentGate uses, because this project's lint rules
// reject setState inside an effect and are right to: the server render has
// no window, so the browser-only answer has to arrive as a snapshot rather
// than as a write after mount.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "katisobiz_install_dismissed";

// Held outside React. beforeinstallprompt can fire before this component
// mounts, and the event is the only way to trigger a real install, so it is
// captured at module level and cannot be missed.
let heldPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stops Chrome showing its own bar, so ours is the only one.
    e.preventDefault();
    heldPrompt = e as InstallPromptEvent;
    notify();
  });
  // Clears the card the moment the install actually completes, including
  // when the member used the browser's own menu rather than our button.
  window.addEventListener("appinstalled", () => {
    heldPrompt = null;
    notify();
  });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function isIos(): boolean {
  // iPadOS reports itself as a Mac, so the touch check catches it too.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Apple's own non-standard flag, still the only reliable tell on iOS.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** "hidden" | "ios" | "android". A string so the snapshot stays comparable. */
function getSnapshot(): "hidden" | "ios" | "android" {
  if (isInstalled()) return "hidden";
  if (localStorage.getItem(DISMISSED_KEY) === "1") return "hidden";
  if (isIos()) return "ios";
  return heldPrompt ? "android" : "hidden";
}

// The server has no window, and rendering the card then removing it would
// flash it at people who have already installed.
function getServerSnapshot(): "hidden" {
  return "hidden";
}

export function InstallApp() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  if (mode === "hidden" || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!heldPrompt) return;
    const prompt = heldPrompt;
    // Usable once only, so it is released before awaiting the answer.
    heldPrompt = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    else dismiss();
    notify();
  }

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand-blue-light p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Put KatisoBiz on your phone</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Add it to your home screen and it opens like an app, with your own icon and no browser
            bar. Nothing to download and it uses no extra space.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      </div>

      {mode === "ios" ? (
        <>
          <button
            type="button"
            onClick={() => setShowSteps((s) => !s)}
            className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            {showSteps ? "Hide the steps" : "Show me how"}
          </button>

          {showSteps && (
            // Written for somebody who has never done this. Apple gives no
            // button, so these steps are the entire feature on iPhone.
            <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-gray-700">
              <li>
                <strong>1.</strong> At the bottom of your screen, press the <strong>Share</strong>{" "}
                button. It is the square with an arrow pointing up out of it.
              </li>
              <li>
                <strong>2.</strong> Scroll down the list that opens.
              </li>
              <li>
                <strong>3.</strong> Press <strong>Add to Home Screen</strong>.
              </li>
              <li>
                <strong>4.</strong> Press <strong>Add</strong> at the top right.
              </li>
              <li className="text-gray-500">
                The KatisoBiz icon is now on your phone with your other apps. This only works in
                Safari, so if you are in another browser, open katisobiz.co.za in Safari first.
              </li>
            </ol>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={install}
          className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Add to my phone
        </button>
      )}
    </section>
  );
}
