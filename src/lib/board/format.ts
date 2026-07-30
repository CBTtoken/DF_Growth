import { formatZar } from "@/lib/bizup/money";

// Display helpers shared by the board pages, the cards and the generated
// share image.
//
// formatZar is imported from the KatisoBiz side rather than reimplemented.
// It is the only money formatter in this codebase, it already uses the South
// African thousands convention, and a second one would drift within a month.

/** "R1 200.00", or null when the post carries no price. */
export function boardPrice(priceCents: number | null): string | null {
  return priceCents === null ? null : formatZar(priceCents);
}

/**
 * "Today", "Yesterday", "3 days ago", then a plain date.
 *
 * Stops being relative after a week because "23 days ago" tells a reader
 * nothing useful, and an exact date is a stronger freshness signal on a page
 * a stranger has just landed on from Google.
 */
export function postedWhen(publishedAt: string): string {
  const published = new Date(publishedAt);
  const days = Math.floor((Date.now() - published.getTime()) / (24 * 60 * 60 * 1000));

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return published.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
