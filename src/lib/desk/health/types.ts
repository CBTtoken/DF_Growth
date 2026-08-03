// What a check is, and how one reports itself.
//
// TheDesk/Handoff_Desk_HealthCheck.md. The four categories are the handoff's
// own, and "usage" leads because Dewald's stated first concern is not
// discovering too late that a quota ran out or a bill grew.

export type HealthStatus = "ok" | "warn" | "fail" | "unknown";
export type HealthCategory = "usage" | "availability" | "change" | "backup";

export type HealthResult = {
  /** Stable identifier. Runs are compared to the previous run of this name. */
  check: string;
  category: HealthCategory;
  status: HealthStatus;
  /** One sentence with the number in it. This is what the screen shows. */
  result: string;
  raw?: unknown;
};

export type HealthCheck = {
  check: string;
  category: HealthCategory;
  /** Shown on the screen. Plain words, not a function name. */
  label: string;
  run: () => Promise<HealthResult>;
};

/**
 * How far through the billing month we are, as a fraction.
 *
 * The trajectory comparison below is the single most useful behaviour in the
 * whole build, per the handoff, and it needs a denominator.
 */
export function monthElapsedFraction(now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return (now.getTime() - start.getTime()) / (next.getTime() - start.getTime());
}

/**
 * Judges usage against the calendar rather than against a flat threshold.
 *
 * Handoff section 5.1: "Sixty percent used on day five is a warning. Sixty
 * percent on day twenty-five is fine. This is the single most useful
 * behaviour in the whole build."
 *
 * A flat "warn at 80%" is the version everybody builds and it is close to
 * useless: it stays quiet through the three weeks when you could still do
 * something, then fires on the day you run out. Comparing consumption
 * against time elapsed catches the trajectory while there is still a month
 * left to act in.
 *
 * The tolerance stops it crying wolf on the first of the month, when a
 * single request is an infinite percentage ahead of nothing.
 */
export function judgeTrajectory(
  used: number,
  limit: number,
  now = new Date(),
  tolerance = 0.15
): { status: HealthStatus; consumed: number; elapsed: number } {
  const elapsed = monthElapsedFraction(now);
  const consumed = limit > 0 ? used / limit : 0;

  if (consumed >= 1) return { status: "fail", consumed, elapsed };

  // Early in the month a small absolute usage looks enormous as a ratio, so
  // nothing warns until there is enough of the month gone to mean anything.
  const tooEarlyToTell = elapsed < 0.1 && consumed < 0.25;
  if (tooEarlyToTell) return { status: "ok", consumed, elapsed };

  if (consumed > elapsed + tolerance) return { status: "warn", consumed, elapsed };
  return { status: "ok", consumed, elapsed };
}

/** "62% of 10,000, and we are 40% through the month" */
export function describeUsage(used: number, limit: number, unit: string, now = new Date()): string {
  const { consumed, elapsed } = judgeTrajectory(used, limit, now);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const num = (n: number) => n.toLocaleString("en-ZA", { maximumFractionDigits: 2 });
  return `${num(used)} of ${num(limit)} ${unit}, ${pct(consumed)} used with ${pct(elapsed)} of the month gone`;
}

/**
 * Every check catches its own failures.
 *
 * A provider being slow, unreachable or returning something unexpected is a
 * normal Tuesday, and it must not take the rest of the run down with it. An
 * unreadable provider reports unknown, which the handoff insists is never
 * dressed up as fine.
 */
export async function safely(check: HealthCheck): Promise<HealthResult> {
  try {
    return await check.run();
  } catch (err) {
    return {
      check: check.check,
      category: check.category,
      status: "unknown",
      result: `Could not be read: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
