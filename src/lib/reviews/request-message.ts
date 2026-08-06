import { formatZar } from "@/lib/bizup/money";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
//
// The message a member sends asking for a review — from KatisoBiz once an
// invoice is settled, or from Growth's own "Grow Your Reviews" manual
// block. Same wording either way, since it's the same ask; the invoice
// context is the only thing that differs. Written to be sendable as-is,
// short, and sound like the member wrote it, not a platform. South
// African, friendly, direct. No em dashes anywhere in this file.
//
// Lives outside src/lib/bizup on purpose: both products send this message,
// and neither owns it.

export interface ReviewRequestInput {
  customerName: string | null;
  businessName: string;
  reviewUrl: string;
  /** Present only for the KatisoBiz invoice-triggered send. */
  invoice?: { number: string; totalCents: number } | null;
}

export function reviewRequestMessage(input: ReviewRequestInput): string {
  const greeting = input.customerName ? `Good day ${input.customerName},` : "Good day,";

  const thanks = input.invoice
    ? `Thank you for choosing ${input.businessName}. Invoice ${input.invoice.number} for ${formatZar(input.invoice.totalCents)} is settled, and we would love to know how we did.`
    : `Thank you for choosing ${input.businessName}. We would love to know how we did.`;

  return [
    greeting,
    "",
    thanks,
    "",
    `If you have a minute, please leave us a quick review here: ${input.reviewUrl}`,
    "",
    "It means a lot and helps other people find us.",
    "",
    "Thank you again!",
    input.businessName,
  ].join("\n");
}

/**
 * Plain words for how long ago a review was last asked for, mirroring
 * remindedAgoLabel in reminders.ts but with the right verb for this
 * context — "Reminded" would be misleading here, this isn't chasing money.
 */
export function requestedAgoLabel(lastRequestedAt: string | null, now: number): string | null {
  if (!lastRequestedAt) return null;
  const days = Math.floor((now - new Date(lastRequestedAt).getTime()) / 86400000);
  if (days <= 0) return "Asked today";
  if (days === 1) return "Asked yesterday";
  return `Asked ${days} days ago`;
}
