import { createAdminClient } from "@/lib/supabase/admin";
import { describeUsage, judgeTrajectory, type HealthCheck, type HealthResult } from "./types";

// The checks themselves.
//
// TheDesk/Handoff_Desk_HealthCheck.md sections 5.1 to 5.4. Usage leads
// because the stated first concern is not discovering too late that a quota
// ran out or a bill grew, and that is also the more likely of the two to
// actually happen.
//
// Every check returns rather than throws, and a provider we cannot read
// returns "unknown" with the reason said plainly. The handoff is explicit
// that a guess is worse than an admission.

const ok = (check: string, category: HealthResult["category"], result: string, raw?: unknown): HealthResult =>
  ({ check, category, status: "ok", result, raw });
const unknown = (check: string, category: HealthResult["category"], result: string): HealthResult =>
  ({ check, category, status: "unknown", result });

// ============================================================
// 5.1 Usage and cost
// ============================================================

/**
 * Vercel spend for the current month, from the FOCUS billing charges API.
 *
 * Phase 2: the upcoming-invoice endpoint the first pass tried does not
 * exist for this plan (404). What does exist is `/v1/billing/charges`,
 * which streams FOCUS-format line items at one-day granularity, so the
 * month's real spend is the sum of its BilledCost lines. Verified live
 * against this team before this code shipped.
 *
 * Build CPU is the line that matters here. It was 59 hours in the August
 * cycle, $12.56 of a $15.08 infrastructure total, with everything else in
 * cents, so a jump in this number is almost always a jump in builds. The
 * result names the biggest line for exactly that reason.
 */
async function vercelChargesTotal(
  headers: Record<string, string>,
  teamId: string,
  fromMs: number,
  toMs: number
): Promise<{ total: number; top: { name: string; cost: number } | null }> {
  const from = new Date(fromMs).toISOString();
  const to = new Date(toMs).toISOString();
  const res = await fetch(
    `https://api.vercel.com/v1/billing/charges?teamId=${teamId}&from=${from}&to=${to}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Vercel returned ${res.status} for billing charges.`);

  const byService = new Map<string, number>();
  let total = 0;
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { BilledCost?: number; ServiceName?: string };
    const cost = Number(row.BilledCost ?? 0);
    total += cost;
    const name = row.ServiceName ?? "other";
    byService.set(name, (byService.get(name) ?? 0) + cost);
  }
  const top = [...byService.entries()].sort((a, b) => b[1] - a[1])[0];
  return { total, top: top && top[1] > 0 ? { name: top[0], cost: top[1] } : null };
}

const vercelSpend: HealthCheck = {
  check: "vercel_spend",
  category: "usage",
  label: "Vercel spend this month",
  async run() {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return unknown("vercel_spend", "usage", "No Vercel token is set, so spend cannot be read.");

    const headers = { Authorization: `Bearer ${token}` };
    const teams = await fetch("https://api.vercel.com/v2/teams", { headers }).then((r) => r.json());
    const team = teams.teams?.[0];
    if (!team) return unknown("vercel_spend", "usage", "The Vercel token can see no team.");

    // The Pro plan's included credit is the number worth measuring against:
    // usage under it costs nothing extra, and over it is a real bill.
    const INCLUDED_CREDIT_USD = 20;

    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (today <= monthStart) {
      return ok("vercel_spend", "usage", "The month started today, so there is nothing to measure yet.");
    }

    // This month so far, and last month over the same number of whole days,
    // which is the handoff's "materially above last month at the same point
    // in the cycle" comparison. Whole days only, because the charges API is
    // day-granular.
    const elapsedMs = today - monthStart;
    const prevStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
    const prevEnd = Math.min(prevStart + elapsedMs, monthStart);

    const [current, previous] = await Promise.all([
      vercelChargesTotal(headers, team.id, monthStart, today),
      vercelChargesTotal(headers, team.id, prevStart, prevEnd).catch(() => null),
    ]);

    let { status } = judgeTrajectory(current.total, INCLUDED_CREDIT_USD);
    let comparison = "";
    if (previous) {
      // Materially above: half again more than last month at this point, and
      // by more than a dollar, so a two cent month never cries wolf.
      const materially = current.total > previous.total * 1.5 && current.total - previous.total > 1;
      if (materially && status === "ok") status = "warn";
      comparison = ` Last month at this point: $${previous.total.toFixed(2)}${materially ? ", so this month is running well ahead" : ""}.`;
    }
    const topLine = current.top ? ` Biggest line: ${current.top.name} at $${current.top.cost.toFixed(2)}.` : "";

    return {
      check: "vercel_spend",
      category: "usage",
      status,
      result:
        describeUsage(current.total, INCLUDED_CREDIT_USD, "USD of included credit") + "." + topLine + comparison,
      raw: { total: current.total, previousTotal: previous?.total ?? null, top: current.top },
    };
  },
};

/**
 * Supabase database size against the Pro plan's included 8GB.
 *
 * Read from the database itself rather than the billing API, because
 * pg_database_size is the number that actually decides whether writes start
 * failing, and it needs no extra token.
 */
const supabaseSize: HealthCheck = {
  check: "supabase_db_size",
  category: "usage",
  label: "Database size",
  async run() {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("desk_database_size_bytes");
    if (error || data == null) {
      return unknown("supabase_db_size", "usage", `Could not read the database size: ${error?.message ?? "no value"}`);
    }

    const bytes = Number(data);
    const gb = bytes / 1024 ** 3;
    const INCLUDED_GB = 8;
    const { status } = judgeTrajectory(gb, INCLUDED_GB);

    return {
      check: "supabase_db_size",
      category: "usage",
      status,
      // Size does not reset monthly, so the trajectory wording would mislead.
      // Reported as a plain proportion instead.
      result: `${gb.toFixed(2)} GB of the ${INCLUDED_GB} GB included, ${Math.round((gb / INCLUDED_GB) * 100)}% used`,
      raw: { bytes },
    };
  },
};

/** Resend, which cannot be read with a send-only key. */
const resendUsage: HealthCheck = {
  check: "resend_emails",
  category: "usage",
  label: "Emails sent this month",
  async run() {
    const key = process.env.RESEND_READ_KEY;
    if (!key) {
      return unknown(
        "resend_emails",
        "usage",
        "The Resend key in use is send-only, by design, so it cannot count emails. A separate read key would turn this into a number, against a 3,000 a month free tier."
      );
    }
    const res = await fetch("https://api.resend.com/emails?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return unknown("resend_emails", "usage", `Resend returned ${res.status}.`);
    return ok("resend_emails", "usage", "Resend is readable. Per-month totals are not exposed by their API.");
  },
};

/** Paystack, which has no usage limit, only a status worth watching. */
const paystackStatus: HealthCheck = {
  check: "paystack_account",
  category: "usage",
  label: "Paystack account",
  async run() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) return unknown("paystack_account", "usage", "No Paystack key is set.");
    const res = await fetch("https://api.paystack.co/plan?perPage=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return {
        check: "paystack_account",
        category: "usage",
        status: "fail",
        result: `Paystack rejected the key with ${res.status}. Payments may be affected.`,
      };
    }
    const live = key.startsWith("sk_live");
    return {
      check: "paystack_account",
      category: "usage",
      status: live ? "ok" : "warn",
      result: live
        ? "Answering, in live mode."
        : "Answering, but the key is a TEST key. Real payments will not be taken with it.",
    };
  },
};

// ============================================================
// 5.2 Availability
// ============================================================

/**
 * The public front door of each live system.
 *
 * The handoff's own caveat, and it goes in the README as well: these checks
 * run on the same infrastructure they are checking, so they cannot report
 * that infrastructure being down. A free external pinger is the answer to
 * that, and this build deliberately does not try to be one.
 */
const SITES: { name: string; url: string }[] = [
  { name: "Growth", url: "https://growth.digitalflyersa.co.za" },
  { name: "KatisoBiz", url: "https://katisobiz.co.za" },
  { name: "Moxie", url: "https://moxiemag.co.za" },
  { name: "HelpLift", url: "https://www.helplift.co.za" },
  { name: "FortisLex", url: "https://fortislex.co.za" },
];

const siteChecks: HealthCheck[] = SITES.map((site) => ({
  check: `site_${site.name.toLowerCase()}`,
  category: "availability",
  label: `${site.name} responds`,
  async run() {
    const started = Date.now();
    try {
      const res = await fetch(site.url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
      const ms = Date.now() - started;
      const slow = ms > 3000;
      return {
        check: `site_${site.name.toLowerCase()}`,
        category: "availability",
        status: res.ok ? (slow ? "warn" : "ok") : "fail",
        result: res.ok
          ? `${res.status} in ${ms}ms${slow ? ", slower than it should be" : ""}`
          : `Answered ${res.status}, which is not a working page.`,
        raw: { status: res.status, ms },
      };
    } catch (err) {
      return {
        check: `site_${site.name.toLowerCase()}`,
        category: "availability",
        status: "fail",
        result: `Did not respond: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },
}));

/** The database answers, which is a different question to the site loading. */
const databaseAnswers: HealthCheck = {
  check: "database_answers",
  category: "availability",
  label: "Database answers",
  async run() {
    const started = Date.now();
    const admin = createAdminClient();
    const { error } = await admin.from("growth_clients").select("id", { count: "exact", head: true });
    const ms = Date.now() - started;
    if (error) {
      return { check: "database_answers", category: "availability", status: "fail", result: `Query failed: ${error.message}` };
    }
    return {
      check: "database_answers",
      category: "availability",
      status: ms > 2000 ? "warn" : "ok",
      result: `Answered in ${ms}ms`,
      raw: { ms },
    };
  },
};

// ============================================================
// 5.3 Change detection
// ============================================================

/**
 * Tables with row level security switched off.
 *
 * Reported, never fixed. The handoff is explicit that this build reports and
 * never remediates: turning RLS on under a table that was deliberately left
 * open would break whatever depends on it, at a moment nobody is watching.
 */
const rlsDisabled: HealthCheck = {
  check: "rls_disabled",
  category: "change",
  label: "Tables without row level security",
  async run() {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("desk_tables_without_rls");
    if (error) return unknown("rls_disabled", "change", `Could not read RLS state: ${error.message}`);

    const tables = (data ?? []) as { table_name: string }[];
    if (tables.length === 0) return ok("rls_disabled", "change", "Every public table has RLS enabled.");

    return {
      check: "rls_disabled",
      category: "change",
      status: "warn",
      result: `${tables.length} table(s) without RLS: ${tables.map((t) => t.table_name).join(", ")}`,
      raw: tables,
    };
  },
};

/**
 * Who can reach the database, compared to the last run.
 *
 * This is the closest thing here to "did anyone add something we did not
 * add", and the handoff calls it the most valuable security work in the
 * build. Dewald, 3 August: there should be no other logins on any platform,
 * so any addition at all is worth surfacing.
 */
const authAccounts: HealthCheck = {
  check: "auth_accounts",
  category: "change",
  label: "Accounts with access",
  async run() {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("desk_auth_user_count");
    if (error || data == null) {
      return unknown("auth_accounts", "change", `Could not count accounts: ${error?.message ?? "no value"}`);
    }

    const count = Number(data);
    const previous = await previousRaw("auth_accounts");
    const before = previous ? Number((previous as { count?: number }).count ?? NaN) : NaN;

    if (Number.isFinite(before) && count !== before) {
      return {
        check: "auth_accounts",
        category: "change",
        status: "warn",
        result: `${count} accounts, was ${before} at the last run. Worth knowing why it changed.`,
        raw: { count, before },
      };
    }
    return ok("auth_accounts", "change", `${count} accounts, unchanged since the last run.`, { count });
  },
};

/** The most recent value this check recorded, for comparing against. */
async function previousRaw(checkName: string): Promise<unknown | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("desk_health_runs")
    .select("raw")
    .eq("check_name", checkName)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.raw ?? null;
}

// ============================================================
// 5.4 Backups
// ============================================================

/**
 * How long since a database restore last actually worked.
 *
 * A backup that has never been restored is not a backup. This reports the
 * age of the last success and nothing else: the restore itself runs weekly
 * and outside the request path, because it will not finish inside a function
 * timeout.
 */
const backupAge: HealthCheck = {
  check: "backup_restore_age",
  category: "backup",
  label: "Last successful restore",
  async run() {
    const admin = createAdminClient();
    const { data } = await admin
      .from("desk_backup_restores")
      .select("finished_at, kind, row_counts")
      .eq("succeeded", true)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.finished_at) {
      return {
        check: "backup_restore_age",
        category: "backup",
        status: "fail",
        result: "No restore has ever been tested. Until one is, the backups are untested rather than working.",
      };
    }

    const days = (Date.now() - new Date(data.finished_at).getTime()) / 86_400_000;
    const partial = data.kind === "schema_only";
    return {
      check: "backup_restore_age",
      category: "backup",
      // Section 5.4 and criterion 9: older than eight days is a fail, and a
      // partial restore is never reported as a pass.
      status: days > 8 ? "fail" : partial ? "warn" : "ok",
      result: partial
        ? `Last restore was ${days.toFixed(0)} days ago and was schema only, so the data was never proven to come back.`
        : `Last full restore was ${days.toFixed(0)} days ago.`,
      raw: data,
    };
  },
};

export const ALL_CHECKS: HealthCheck[] = [
  vercelSpend,
  supabaseSize,
  resendUsage,
  paystackStatus,
  ...siteChecks,
  databaseAnswers,
  rlsDisabled,
  authAccounts,
  backupAge,
];
