import type { Metadata } from "next";
import { requireDeskUser } from "@/lib/desk/auth";
import { latestResults, sortBySeverity, CATEGORY_LABEL, type StoredResult } from "@/lib/desk/health/run";
import type { HealthCategory, HealthStatus } from "@/lib/desk/health/types";
import { RunChecksButton } from "./RunChecksButton";

export const metadata: Metadata = { title: "Health", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The health screen.
//
// TheDesk/Handoff_Desk_HealthCheck.md section 4. A button and a list, grouped,
// worst first, in plain words.
//
// The copy rules here are not decoration. Section 2 and section 7: this is a
// tripwire, not breach detection, and a competent intruder will not trip a
// cron job written by the person they are burgling. So nothing on this screen
// says secure, protected, or no breaches detected. It reports what was
// measured and when, and says plainly what it cannot see.

const STATUS_STYLE: Record<HealthStatus, { dot: string; label: string; text: string }> = {
  fail: { dot: "bg-red-500", label: "Needs attention", text: "text-red-700" },
  warn: { dot: "bg-amber-500", label: "Worth a look", text: "text-amber-700" },
  unknown: { dot: "bg-gray-400", label: "Cannot tell", text: "text-gray-600" },
  ok: { dot: "bg-green-500", label: "Fine", text: "text-green-700" },
};

const CATEGORY_ORDER: HealthCategory[] = ["usage", "availability", "change", "backup"];

export default async function HealthPage() {
  await requireDeskUser();
  const results = await latestResults();

  const failing = results.filter((r) => r.status === "fail").length;
  const lastRun = results.reduce<string | null>(
    (latest, r) => (!latest || r.ran_at > latest ? r.ran_at : latest),
    null
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Health</h1>
          <p className="mt-1 text-sm text-gray-500">
            {lastRun
              ? `Last run ${new Date(lastRun).toLocaleString("en-ZA")}`
              : "Nothing has been checked yet."}
          </p>
        </div>
        <RunChecksButton />
      </header>

      {results.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Press Run checks to see where everything stands.
        </p>
      ) : (
        <>
          {failing > 0 && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {failing} {failing === 1 ? "check needs" : "checks need"} attention.{" "}
              {failing === 1 ? "It has" : "They have"} been added to your list.
            </p>
          )}

          {CATEGORY_ORDER.map((category) => {
            const group = sortBySeverity(results.filter((r) => r.category === category));
            if (group.length === 0) return null;
            return (
              <section key={category} className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {CATEGORY_LABEL[category]}
                </h2>
                <ul className="flex flex-col gap-2">
                  {group.map((r) => (
                    <ResultRow key={r.check} result={r} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}

      {/* Section 7, and it goes on the screen rather than only in a README.
          The honest limits of this thing are part of what it reports. */}
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <h2 className="font-semibold text-gray-800">What this cannot tell you</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            Whether anyone has broken in. These checks run on the same machines they are checking,
            and nothing here would catch somebody who knew what they were doing. Quiet is not the
            same as safe.
          </li>
          <li>Whether two-factor authentication is on. Only you can check that.</li>
          <li>Who else has access to accounts outside Supabase, Vercel and GitHub.</li>
          <li>
            That everything is up. If the platform itself is down, so is this page. A free external
            pinger is the answer to that, and this deliberately is not one.
          </li>
        </ul>
      </section>
    </main>
  );
}

function ResultRow({ result }: { result: StoredResult }) {
  const style = STATUS_STYLE[result.status];
  return (
    <li className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{humanName(result.check)}</p>
        <p className="mt-0.5 text-sm text-gray-600">{result.result}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${style.text}`}>{style.label}</span>
    </li>
  );
}

/** "vercel_spend" reads as "Vercel spend" on a screen, not as a variable. */
function humanName(check: string): string {
  const words = check.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
