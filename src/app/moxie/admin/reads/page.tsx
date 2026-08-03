import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { readsDrilldown, requireTeamAccess } from "@/lib/moxie/admin";
import { moxiePath } from "@/lib/moxie/host";

export const metadata: Metadata = {
  title: "Reads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// The reads drill-down. Dewald, 3 August: "can an admin drill down on the
// stats?" This is the count opened up: by day, by edition, and the actual
// recent openings with who and how. Counting started 3 August 2026 and the
// dashboard says so; this page inherits that honesty.
export default async function ReadsDrilldownPage() {
  const access = await requireTeamAccess();
  if (!access) redirect(await moxiePath("/login?next=/admin/reads"));

  const [data, adminHref] = await Promise.all([readsDrilldown(), moxiePath("/admin")]);
  const dayMax = Math.max(1, ...data.perDay.map((d) => d.count));

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn />

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <Link
            href={adminHref}
            className="font-moxie-label text-[0.68rem] font-bold uppercase tracking-[0.16em] text-moxie-charcoal/60 hover:text-moxie-orange"
          >
            &larr; Back to the dashboard
          </Link>
          <h1 className="font-moxie-display mt-3 text-4xl font-bold text-moxie-charcoal">Reads</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-moxie-charcoal/60">
            Every opening of the magazine reader, counted since 3 August 2026. A signed-in
            reader is counted by account; everyone else is counted and nothing more.
          </p>

          <h2 className="font-moxie-display mt-10 text-2xl font-bold text-moxie-charcoal">
            The last fourteen days
          </h2>
          <div className="mt-4 border border-moxie-border bg-white p-5">
            <div className="flex h-24 items-end gap-1.5">
              {data.perDay.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-moxie-label text-[0.6rem] font-bold text-moxie-charcoal/70">
                    {d.count > 0 ? d.count : ""}
                  </span>
                  <div
                    className="w-full bg-moxie-orange"
                    style={{ height: `${Math.max(3, Math.round((d.count / dayMax) * 100))}%`, opacity: d.count === 0 ? 0.15 : 1 }}
                  />
                  <span className="font-moxie-label text-[0.52rem] font-bold uppercase tracking-[0.08em] text-moxie-charcoal/50">
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <h2 className="font-moxie-display mt-10 text-2xl font-bold text-moxie-charcoal">
            By edition
          </h2>
          {data.perEdition.length === 0 ? (
            <p className="mt-4 border border-moxie-border bg-white p-6 text-sm text-moxie-charcoal/60">
              No reads counted yet. The first person to open an edition starts this table.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-moxie-border bg-white">
              <table className="w-full text-left text-sm text-moxie-charcoal">
                <thead>
                  <tr className="font-moxie-label border-b border-moxie-border text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                    <th className="px-4 py-3">Edition</th>
                    <th className="px-4 py-3">Reads, 30 days</th>
                    <th className="px-4 py-3">Reads, ever</th>
                    <th className="px-4 py-3">Signed-in readers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perEdition.map((e) => (
                    <tr key={e.title} className="border-b border-moxie-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{e.title}</td>
                      <td className="px-4 py-3">{e.last30d}</td>
                      <td className="px-4 py-3">{e.total}</td>
                      <td className="px-4 py-3">{e.uniqueSignedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="font-moxie-display mt-10 text-2xl font-bold text-moxie-charcoal">
            Recent openings
          </h2>
          {data.recent.length === 0 ? (
            <p className="mt-4 border border-moxie-border bg-white p-6 text-sm text-moxie-charcoal/60">
              Nothing yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-moxie-border bg-white">
              <table className="w-full text-left text-sm text-moxie-charcoal">
                <thead>
                  <tr className="font-moxie-label border-b border-moxie-border text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Edition</th>
                    <th className="px-4 py-3">Who</th>
                    <th className="px-4 py-3">How they got in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i} className="border-b border-moxie-border/60 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{when(r.at)}</td>
                      <td className="px-4 py-3">{r.editionTitle}</td>
                      <td className="px-4 py-3">{r.who}</td>
                      <td className="px-4 py-3">{r.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
