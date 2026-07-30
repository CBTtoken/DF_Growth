import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";

// The one-click unsubscribe link for a KatisoBiz member.
//
// The token reuses the existing HMAC helper rather than inventing a second
// scheme, but the value being signed is namespaced with a "bizup:" prefix.
// Without that, a token minted for a Growth client whose id happened to
// match a KatisoBiz account id would unsubscribe the wrong person in the
// wrong system. Cheap insurance against a class of bug that would be
// miserable to diagnose.
export function BIZUP_UNSUBSCRIBE_SUBJECT(accountId: string): string {
  return `bizup:${accountId}`;
}

/** The brand domain, so a member sees katisobiz.co.za and not the Growth host. */
const ORIGIN = process.env.NEXT_PUBLIC_KATISOBIZ_URL ?? "https://katisobiz.co.za";

/**
 * A link that unsubscribes exactly one member and nobody else.
 *
 * Deliberately per member rather than one shared address: a single generic
 * link would let anyone unsubscribe anyone, and while the damage is small,
 * the fix is one line of HMAC.
 */
export function bizupUnsubscribeUrl(accountId: string): string {
  const token = generateUnsubscribeToken(BIZUP_UNSUBSCRIBE_SUBJECT(accountId));
  return `${ORIGIN}/unsubscribe?a=${accountId}&token=${token}`;
}
