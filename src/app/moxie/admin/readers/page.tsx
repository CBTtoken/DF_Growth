import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { readersDrilldown, requireTeamAccess } from "@/lib/moxie/admin";
import { moxiePath } from "@/lib/moxie/host";

export const metadata: Metadata = {
  title: "Readers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "all", label: "Everyone" },
  { id: "never_paid", label: "Never paid" },
  { id: "members", label: "Members" },
  { id: "reading", label: "Actually reading" },
] as const;

// The people drill-down: every known reader, merged from three honest
// sources (tagged reader accounts, read events, subscriptions). "Never
// paid" is the upsell list a magazine owner actually wants.
export default async function ReadersDrilldownPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const access = await requireTeamAccess();
  if (!access) redirect(await moxiePath("/login?next=/admin/readers"));
  const canOperate = access.role === "publisher";

  const { filter: rawFilter } = await searchParams;
  const filter = FILTERS.some((f) => f.id === rawFilter) ? rawFilter! : "all";

  const [people, adminHref, selfHref, csvHref] = await Promise.all([
    readersDrilldown(),
    moxiePath("/admin"),
    moxiePath("/admin/readers"),
    moxiePath("/admin/readers/export"),
  ]);

  const rows = people.filter((p) => {
    switch (filter) {
      case "never_paid":
        return p.membership === "never paid";
      case "members":
        return p.membership === "active" || p.membership === "past_due";
      case "reading":
        return p.reads > 0;
      default:
        return true;
    }
  });

  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "";

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
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-moxie-display text-4xl font-bold text-moxie-charcoal">Readers</h1>
            {canOperate && rows.length > 0 && (
              <a
                href={`${csvHref}?filter=${filter}`}
                className="font-moxie-label border border-moxie-border bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-moxie-charcoal transition hover:bg-white/60"
              >
                Export this list
              </a>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-moxie-charcoal/60">
            Everyone Moxie knows about: reader accounts, people who have opened an edition, and
            members. Reader accounts and reads are counted from 3 August 2026.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={`${selfHref}?filter=${f.id}`}
                className={`font-moxie-label border px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] transition ${
                  filter === f.id
                    ? "border-moxie-orange bg-moxie-orange text-white"
                    : "border-moxie-border bg-white text-moxie-charcoal hover:border-moxie-orange"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 border border-moxie-border bg-white p-6 text-sm text-moxie-charcoal/60">
              Nobody here yet under this filter.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-moxie-border bg-white">
              <table className="w-full text-left text-sm text-moxie-charcoal">
                <thead>
                  <tr className="font-moxie-label border-b border-moxie-border text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                    <th className="px-4 py-3">Reader</th>
                    <th className="px-4 py-3">Standing</th>
                    <th className="px-4 py-3">Reads</th>
                    <th className="px-4 py-3">Last read</th>
                    <th className="px-4 py-3">Known since</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.email} className="border-b border-moxie-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{p.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
                            p.membership === "active"
                              ? "text-moxie-teal"
                              : p.membership === "past_due"
                                ? "text-moxie-orange"
                                : p.membership === "cancelled"
                                  ? "text-moxie-charcoal/50"
                                  : "text-moxie-charcoal/70"
                          }`}
                        >
                          {p.membership === "active" ? "member" : p.membership.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{p.reads}</td>
                      <td className="px-4 py-3">{date(p.lastReadAt)}</td>
                      <td className="px-4 py-3">{date(p.since)}</td>
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
