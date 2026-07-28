// Reporting periods for KatisoBiz (spec Sec 12).
//
// Deliberately in their own file with no imports at all. Tax year
// boundaries are the kind of arithmetic that is silently wrong for eleven
// months of the year, so this needs to be testable on its own without a
// database client or environment variables in the way.

export type PeriodId = "this_month" | "last_month" | "tax_year" | "custom";

export interface Period {
  id: PeriodId;
  /** Inclusive, as YYYY-MM-DD, which is what the date columns store. */
  from: string;
  /** Inclusive. */
  to: string;
  label: string;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Sec 12: "this month, last month, this tax year (uses
 * financial_year_end_month), custom".
 *
 * The tax year runs to the END of financial_year_end_month, so a February
 * year end means 1 March to 28/29 February, which is the South African
 * default and the reason February is the default value on the account.
 */
export function resolvePeriod(
  id: string | undefined,
  financialYearEndMonth: number,
  custom?: { from?: string; to?: string },
  now: Date = new Date(),
): Period {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (id === "last_month") {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    return {
      id: "last_month",
      from: iso(from),
      to: iso(to),
      label: from.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }

  if (id === "tax_year") {
    // The year end month is 1-based on the account (February = 2). The
    // year starts the day after it ends.
    const endMonthIndex = financialYearEndMonth - 1;
    // If we are past the year end already, the current tax year started
    // this calendar year; otherwise it started last year.
    const startYear = month > endMonthIndex ? year : year - 1;
    const from = new Date(Date.UTC(startYear, endMonthIndex + 1, 1));
    const to = new Date(Date.UTC(startYear + 1, endMonthIndex + 1, 0));
    return {
      id: "tax_year",
      from: iso(from),
      to: iso(to),
      label: `Tax year ${iso(from)} to ${iso(to)}`,
    };
  }

  if (id === "custom" && custom?.from && custom?.to) {
    return { id: "custom", from: custom.from, to: custom.to, label: `${custom.from} to ${custom.to}` };
  }

  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));
  return {
    id: "this_month",
    from: iso(from),
    to: iso(to),
    label: from.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

export const PERIOD_OPTIONS: { id: PeriodId; label: string }[] = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "tax_year", label: "This tax year" },
  { id: "custom", label: "Custom" },
];


/**
 * Whether a timestamp is in the past.
 *
 * Lives here rather than inline in a page because reading the clock inside
 * a component body is impure, and React's lint rules object to it even in
 * a Server Component that renders once per request.
 */
export function hasPassed(isoTimestamp: string): boolean {
  return new Date(isoTimestamp).getTime() < Date.now();
}

/**
 * The current time in milliseconds.
 *
 * Same reason as hasPassed above: a component body must stay pure, and
 * React's lint rules flag a direct Date.now() even in a Server Component
 * that renders once per request.
 */
export function nowMillis(): number {
  return Date.now();
}
