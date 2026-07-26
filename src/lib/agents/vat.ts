// Agent terms 3.6: "Commission is calculated on the amount paid excluding
// VAT."
//
// Confirmed by Dewald 2026-07-26: DigitalFlyer is NOT VAT registered yet,
// but will be soon, and the published prices are VAT inclusive. Those two
// facts together are a trap, so this is one constant rather than a number
// written into a calculation somewhere.
//
// Today, unregistered, there is no VAT inside R1,199 at all, so the whole
// amount is the commission basis and 25% of a Growth annual member is
// R299.75. The day registration happens, that same R1,199 becomes
// R1,042.61 plus VAT, the basis drops, and 25% becomes R260.65. Nothing
// about the payment changes, only what share of it is ours to pay
// commission on.
//
// If that day arrives and this is still hardcoded, every agent is silently
// overpaid by about 13% on every payment, and the recruitment page quietly
// starts advertising numbers we do not honour. Both are read from here, so
// registration day is a one-line change with a test, not an archaeology
// exercise across the webhook and a marketing page.
export const VAT_REGISTERED = false;

export const VAT_RATE = 0.15;

// The portion of a payment that commission is calculated on. Takes and
// returns rands.
export function commissionBasis(amountPaid: number): number {
  return VAT_REGISTERED ? amountPaid / (1 + VAT_RATE) : amountPaid;
}
