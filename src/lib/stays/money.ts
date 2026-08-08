import type { DepositKind } from "@/lib/stays/types";

// Money, in one place, so a total shown to a guest, a total charged, and a
// total invoiced in KatisoBiz can never disagree.

/** "R1 250" for 125000. Whole rand unless there are cents to show. */
export function rand(cents: number): string {
  const value = cents / 100;
  const hasCents = Math.round(cents) % 100 !== 0;
  return `R${value.toLocaleString("en-ZA", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
}

/**
 * The deposit due at booking.
 *
 * The member sets this per room type and per tour, as a percentage or a
 * fixed amount (handoff Job 4). A fixed deposit larger than the total is
 * capped at the total: paying more than the thing costs is never right, and
 * it happens the moment somebody sets a R500 deposit and then sells a
 * one-night stay for R450.
 *
 * Rounded to the whole rand, because a deposit of R487.53 reads like a
 * mistake to the person being asked to pay it.
 */
export function depositCents(
  totalCents: number,
  kind: DepositKind,
  percent: number,
  fixedCents: number
): number {
  const raw = kind === "fixed" ? fixedCents : Math.round((totalCents * percent) / 100);
  const rounded = Math.round(raw / 100) * 100;
  return Math.max(0, Math.min(rounded, totalCents));
}

/** Nights between two ISO dates, half open. The 4th to the 6th is two. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const from = Date.parse(`${checkIn}T00:00:00Z`);
  const to = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/** "Fri 12 September 2026", the way a South African guest reads a date. */
export function longDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "12 Sep", for tight spaces like a dashboard row. */
export function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Today in Johannesburg, as YYYY-MM-DD. */
export function todayInSA(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

/** Adds days to an ISO date, staying in date space rather than time space. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
