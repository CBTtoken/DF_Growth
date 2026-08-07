// Sprint "Onboarding two doors" item 1. The R450 done-for-you build, as a
// thing a member can buy in one checkout rather than a tick that generates
// an email to Dewald.

// Rand, in Paystack's smallest-currency-unit convention (cents for ZAR),
// matching amountForTier's own unmodified pass-through. Hardcoded rather
// than read from a Paystack Plan because this is a single charge, not a
// subscription, so there is no Plan object to read it from. Dewald set it
// on 7 August 2026.
export const BUILD_ORDER_AMOUNT_CENTS = 45_000;
export const BUILD_ORDER_AMOUNT_LABEL = "R450";

// The promise made on the checkout page, so it is calculated the same way
// everywhere rather than being a sentence in one place and a date in
// another.
export const BUILD_ORDER_WORKING_DAYS = 3;

// Saturdays and Sundays only. South African public holidays are NOT
// accounted for: a holiday inside the window quietly makes the promise a
// day optimistic. Left deliberately simple rather than half-solved with a
// hardcoded holiday list that would go stale, and flagged for Dewald, since
// the honest fix is either a real holiday table or wording the promise as
// "three working days from when we start".
export function buildOrderDueAt(from: Date = new Date(), workingDays = BUILD_ORDER_WORKING_DAYS): Date {
  const due = new Date(from.getTime());
  let remaining = workingDays;

  while (remaining > 0) {
    due.setDate(due.getDate() + 1);
    const day = due.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }

  return due;
}

export type BuildOrderStatus = "awaiting_payment" | "paid" | "in_progress" | "delivered" | "cancelled";

// What the member is told, in the words they will read back to us if we
// miss it. Kept next to the calculation so the two cannot drift.
export const BUILD_ORDER_PROMISE = "Your page is live within 3 working days of payment.";

// What R450 does and does not cover, per Dewald 7 August 2026. Rendered on
// the build door and reused in the FAQ, so the scope is stated once.
export const BUILD_ORDER_INCLUDED = [
  "A page style chosen for your trade, not a blank template",
  "Your photos processed, straightened and picked for the page",
  "Your words turned into the page copy, written properly",
  "Your best photo chosen and set as the front-page image",
];

export const BUILD_ORDER_EXCLUDED = [
  "Logo design",
  "Loading products into your shop",
];
