import type { ReactNode } from "react";

// The actual buttons, drawn inline in the help text.
//
// Dewald asked for screenshots so a member sees exactly what to press.
// This does that job better than a screenshot would, for three reasons
// worth writing down so nobody "improves" it back into images later.
//
// 1. A screenshot goes stale. This product's interface changed a dozen
//    times in three days, and a help page showing last week's button is
//    worse than one showing none: it tells the member the wrong thing with
//    complete confidence.
// 2. A screenshot of the real app needs a login, and any real account
//    contains a real member's customers. Faking an account to photograph
//    is work that has to be redone every time the design moves.
// 3. Images cost weight. The audience is on a mid-range Android on prepaid
//    data, and the landing page draws its own hero document in CSS for
//    exactly this reason.
//
// These use the same colours and shapes as the real controls, so they stay
// accurate as long as the design tokens do.

/** The primary action button: issuing, saving, paying. */
export function Btn({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
      {children}
    </span>
  );
}

/** A secondary or outline control. */
export function BtnOutline({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700">
      {children}
    </span>
  );
}

/** Anything that sends on WhatsApp, which is always this green. */
export function BtnWhatsApp({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-full bg-[#25D366] px-3 py-1 text-sm font-bold text-white">
      {children}
    </span>
  );
}

/** Marking money as received. */
export function BtnPaid({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-full bg-green-600 px-3 py-1 text-sm font-bold text-white">
      {children}
    </span>
  );
}

/** A menu item at the top of the app, so "go to Settings" shows the tab. */
export function MenuItem({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
      {children}
    </span>
  );
}

/**
 * A field, so "fill in your VAT number" shows the box rather than
 * describing it.
 */
export function FieldBox({ label }: { label: string }) {
  return (
    <span className="mx-0.5 inline-block whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-500">
      {label}
    </span>
  );
}
