/**
 * SVC's button and control classes, defined once.
 *
 * The brand rules these encode (handoff section 4, Brand Identity Guide May
 * 2026): sharp rectangles with zero border radius on every button, box and
 * card; minimum 48px tall tap targets; amber never a background for a whole
 * view but allowed on the one primary CTA; no red anywhere. Keeping them
 * here means a rule change is one edit, and a page that hand-rolls a
 * rounded button stands out in review.
 */

/** The one primary action per screen. Amber, per the guide's CTA rule. */
export const svcBtnPrimary =
  "inline-flex min-h-12 w-full items-center justify-center bg-svc-amber px-6 py-3 text-base font-semibold text-svc-ink transition-colors hover:bg-svc-ink hover:text-white sm:w-auto";

/** Solid green, for primary actions on cream where amber is already used. */
export const svcBtnGreen =
  "inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-svc-ink sm:w-auto";

/** Visibly secondary: outlined rather than solid (handoff section 5). */
export const svcBtnOutline =
  "inline-flex min-h-12 w-full items-center justify-center border-2 border-svc-green px-6 py-3 text-base font-semibold text-svc-green transition-colors hover:bg-svc-green hover:text-white sm:w-auto";

/** Outlined for dark (green or blue) backgrounds. */
export const svcBtnOutlineOnDark =
  "inline-flex min-h-12 w-full items-center justify-center border-2 border-white px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white hover:text-svc-ink sm:w-auto";

/** Form inputs: sharp corners, 16px text so iOS Safari never auto-zooms. */
export const svcInput =
  "w-full border-2 border-svc-ink/20 bg-white px-4 py-3 text-base text-svc-ink placeholder:text-svc-ink/40 focus:border-svc-green focus:outline-none";

export const svcLabel = "block text-sm font-semibold uppercase tracking-wide text-svc-ink/70";
