import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import {
  listEditionsForAdmin,
  listMembers,
  listTeam,
  membershipSummary,
  ownerStats,
  requireTeamAccess,
} from "@/lib/moxie/admin";
import { moxiePath } from "@/lib/moxie/host";
import { addTeamMember, createCodeBatch, removeTeamMember } from "./actions";

export const metadata: Metadata = {
  title: "Publisher",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Filters rather than separate pages, the same shape as the KatisoBiz
// admin, which Dewald named as the standard this screen should meet: the
// numbers stay in view while the list narrows underneath them.
const MEMBER_FILTERS = [
  { id: "all", label: "Everyone" },
  { id: "active", label: "Active" },
  { id: "annual", label: "Annual" },
  { id: "past_due", label: "Payment failed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "";

export default async function MoxieAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    error?: string;
    filter?: string;
    team_added?: string;
    team_removed?: string;
    team_error?: string;
  }>;
}) {
  const { created, error, filter: rawFilter, team_added, team_removed, team_error } = await searchParams;
  const access = await requireTeamAccess();
  if (!access) redirect(await moxiePath("/login?next=/admin"));
  // A writer sees the numbers, the members and the editions. The levers
  // (codes, team changes) render for publishers only, and the actions
  // behind them check again server-side either way.
  const canOperate = access.role === "publisher";

  const [editions, members, memberList, team, stats2, csvBase, adminBase, membersCsvHref] = await Promise.all([
    listEditionsForAdmin(),
    membershipSummary(),
    listMembers(),
    listTeam(),
    ownerStats(),
    moxiePath("/admin/codes"),
    moxiePath("/admin"),
    moxiePath("/admin/members"),
  ]);

  const rand = (cents: number) =>
    `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const readsByEdition = new Map(stats2.editionReads.map((r) => [r.editionId, r]));
  const incomeMax = Math.max(1, ...stats2.incomeByMonth.map((m) => m.cents));

  const filter = MEMBER_FILTERS.some((f) => f.id === rawFilter) ? rawFilter! : "all";
  const filteredMembers = memberList.filter((m) => {
    switch (filter) {
      case "active":
        return m.status === "active";
      case "annual":
        return m.interval === "annual" && m.status === "active";
      case "past_due":
        return m.status === "past_due";
      case "cancelled":
        return m.status === "cancelled";
      default:
        return true;
    }
  });


  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn />

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-orange">
            Publisher
          </p>
          <h1 className="font-moxie-display mt-3 text-4xl font-bold sm:text-5xl text-moxie-charcoal">
            Moxie Magazine
          </h1>

          {created && (
            <p className="mt-6 border-l-[3px] border-moxie-teal bg-white p-4 text-sm text-moxie-charcoal">
              {created} access codes created. Download the CSV from the edition below.
            </p>
          )}
          {error === "input" && (
            <p className="mt-6 border-l-[3px] border-moxie-orange bg-white p-4 text-sm text-moxie-charcoal">
              Choose an edition and how many codes you need.
            </p>
          )}

          {/* The funnel, left to right the way a reader travels: read it,
              made an account, paid, wobbled, left. */}
          <h2 className="font-moxie-display mt-10 text-2xl font-bold text-moxie-charcoal">
            The funnel
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Reads, 30 days", value: stats2.reads30d, note: `${stats2.readsTotal} ever` },
              { label: "Signed-in readers", value: stats2.uniqueSignedInReaders, note: "unique people" },
              { label: "Reader accounts", value: stats2.readerAccounts, note: `${stats2.readersNeverPaid} never paid` },
              { label: "Paying members", value: members.active, note: `${members.annual} on annual` },
              { label: "Payment failed", value: members.pastDue, note: "worth a nudge" },
              { label: "Dropped off", value: members.cancelled, note: "cancelled" },
            ].map((s) => (
              <div key={s.label} className="border border-moxie-border bg-white p-5">
                <p className="font-moxie-display text-3xl font-bold text-moxie-charcoal">{s.value}</p>
                <p className="font-moxie-label mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                  {s.label}
                </p>
                <p className="mt-1 text-xs text-moxie-charcoal/50">{s.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-moxie-charcoal/50">
            Reads and reader accounts are counted from 3 August 2026, when counting started.
            Nothing before that date is guessed at.
          </p>

          {/* Money, from real movements only: webhook-recorded subscription
              charges and paid once-off purchases. A comped membership never
              appears here, which is the point of counting money rather than
              members. */}
          <h2 className="font-moxie-display mt-12 text-2xl font-bold text-moxie-charcoal">
            Income
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_2fr]">
            <div className="border border-moxie-border bg-white p-5">
              <p className="font-moxie-display text-3xl font-bold text-moxie-charcoal">
                {rand(stats2.incomeThisMonthCents)}
              </p>
              <p className="font-moxie-label mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                This month
              </p>
            </div>
            <div className="border border-moxie-border bg-white p-5">
              <p className="font-moxie-display text-3xl font-bold text-moxie-charcoal">
                {rand(stats2.incomeLastMonthCents)}
              </p>
              <p className="font-moxie-label mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Last month
              </p>
            </div>
            <div className="border border-moxie-border bg-white p-5">
              <p className="font-moxie-label text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Six months
              </p>
              <div className="mt-3 flex h-16 items-end gap-2">
                {stats2.incomeByMonth.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full bg-moxie-orange"
                      style={{ height: `${Math.max(3, Math.round((m.cents / incomeMax) * 100))}%`, opacity: m.cents === 0 ? 0.15 : 1 }}
                      title={`${m.month}: ${rand(m.cents)}`}
                    />
                    <span className="font-moxie-label text-[0.55rem] font-bold uppercase tracking-[0.1em] text-moxie-charcoal/50">
                      {m.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The members themselves, not just their count. Dewald, 3 August:
              "we can't see the members, see their subscriptions and so on". */}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-moxie-display text-2xl font-bold text-moxie-charcoal">Members</h2>
            {canOperate && memberList.length > 0 && (
              <a
                href={membersCsvHref}
                className="font-moxie-label border border-moxie-border bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-moxie-charcoal transition hover:bg-moxie-cream"
              >
                Export CSV
              </a>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {MEMBER_FILTERS.map((f) => (
              <Link
                key={f.id}
                href={`${adminBase}?filter=${f.id}`}
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

          {filteredMembers.length === 0 ? (
            <p className="mt-4 border border-moxie-border bg-white p-6 text-sm text-moxie-charcoal/60">
              Nobody here yet{filter === "all" ? "." : " under this filter."}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto border border-moxie-border bg-white">
              <table className="w-full text-left text-sm text-moxie-charcoal">
                <thead>
                  <tr className="font-moxie-label border-b border-moxie-border text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.email + m.started_at} className="border-b border-moxie-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{m.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
                            m.status === "active"
                              ? "text-moxie-teal"
                              : m.status === "past_due"
                                ? "text-moxie-orange"
                                : "text-moxie-charcoal/50"
                          }`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{m.interval === "annual" ? "Annual" : "Monthly, R49"}</td>
                      <td className="px-4 py-3">{date(m.started_at)}</td>
                      <td className="px-4 py-3">
                        {m.status === "cancelled"
                          ? `Cancelled ${date(m.cancelled_at)}`
                          : m.cancelled_at
                            ? `Ends ${date(m.current_period_end)}, not renewing`
                            : date(m.current_period_end)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="font-moxie-display mt-12 text-2xl font-bold text-moxie-charcoal">
            Editions
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            {editions.map((e) => (
              <div key={e.id} className="border border-moxie-border bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-moxie-display text-xl font-bold text-moxie-charcoal">
                      {e.title}
                    </p>
                    <p className="font-moxie-label mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                      {e.status.replace("_", " ")}
                      {e.published_at
                        ? ` · published ${new Date(e.published_at).toLocaleDateString("en-ZA")}`
                        : ""}
                      {e.free_from
                        ? ` · free from ${new Date(e.free_from).toLocaleDateString("en-ZA")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="font-moxie-display text-lg font-bold text-moxie-charcoal">
                        {readsByEdition.get(e.id)?.last30d ?? 0}
                      </p>
                      <p className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                        reads, 30 days
                      </p>
                    </div>
                    <div>
                      <p className="font-moxie-display text-lg font-bold text-moxie-charcoal">
                        {e.codesRedeemed} / {e.codesTotal}
                      </p>
                      <p className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                        codes redeemed
                      </p>
                    </div>
                  </div>
                </div>

                {canOperate && (
                <form
                  action={createCodeBatch}
                  className="mt-5 flex flex-wrap items-end gap-3 border-t border-moxie-border pt-5"
                >
                  <input type="hidden" name="editionId" value={e.id} />
                  <label className="flex flex-col gap-1">
                    <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                      How many
                    </span>
                    <input
                      type="number"
                      name="count"
                      min={1}
                      max={2000}
                      defaultValue={100}
                      className="w-28 border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                      Batch label
                    </span>
                    <input
                      type="text"
                      name="label"
                      placeholder="SVC members, August send"
                      className="w-full border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
                    />
                  </label>
                  <button
                    type="submit"
                    className="font-moxie-label bg-moxie-charcoal px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-charcoal/85"
                  >
                    Generate codes
                  </button>
                  {e.codesTotal > 0 && (
                    <Link
                      href={`${csvBase}?edition=${e.slug}`}
                      className="font-moxie-label border border-moxie-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-moxie-charcoal transition hover:bg-moxie-cream"
                    >
                      Download CSV
                    </Link>
                  )}
                </form>
                )}
              </div>
            ))}
          </div>

          {/* Said plainly, because the interface is where an overclaim would
              do damage. A code is a latch on a shared link. It cannot stop
              sharing and must never be described as though it can. */}
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-moxie-charcoal/60">
            Codes rotate per edition, so a code that gets passed around costs one edition rather
            than a membership. That is all they do. Anything a browser can display can be
            captured, so this limits the damage rather than preventing sharing.
          </p>

          {!canOperate && (
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-moxie-charcoal/60">
              You are seeing the writer&apos;s view: everything above is yours to read, and the
              publisher tools (access codes, team changes, publishing) stay with the publisher.
            </p>
          )}

          {canOperate && (
          <>
          {/* The team. One row is both doors: a publisher gets this
              dashboard and the whole Kwaai Press builder, a writer gets the
              builder's writing side only. */}
          <h2 className="font-moxie-display mt-12 text-2xl font-bold text-moxie-charcoal">
            The team
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-moxie-charcoal/60">
            A publisher can use this dashboard and everything in Kwaai Press, including approvals
            and publishing. A writer can write and submit in Kwaai Press and nothing else. No
            email is sent: you hand the password over yourself.
          </p>

          {team_added && (
            <p className="mt-4 border-l-[3px] border-moxie-teal bg-white p-4 text-sm text-moxie-charcoal">
              {decodeURIComponent(team_added)} is on the team.
            </p>
          )}
          {team_removed && (
            <p className="mt-4 border-l-[3px] border-moxie-teal bg-white p-4 text-sm text-moxie-charcoal">
              Removed. Their account still exists; it just no longer opens the builder or this
              dashboard.
            </p>
          )}
          {team_error && (
            <p className="mt-4 border-l-[3px] border-moxie-orange bg-white p-4 text-sm text-moxie-charcoal">
              {team_error === "password"
                ? "That address has no account yet, so it needs a password of at least 8 characters."
                : team_error === "input"
                  ? "An email address and a role are the minimum."
                  : "Could not save that just now. Try again."}
            </p>
          )}

          {team.length > 0 && (
            <div className="mt-4 overflow-x-auto border border-moxie-border bg-white">
              <table className="w-full text-left text-sm text-moxie-charcoal">
                <thead>
                  <tr className="font-moxie-label border-b border-moxie-border text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Since</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {team.map((t) => (
                    <tr key={t.userId} className="border-b border-moxie-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {t.displayName ? `${t.displayName} · ` : ""}
                        {t.email ?? t.userId}
                      </td>
                      <td className="px-4 py-3 capitalize">{t.role}</td>
                      <td className="px-4 py-3">{date(t.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={removeTeamMember}>
                          <input type="hidden" name="userId" value={t.userId} />
                          <button
                            type="submit"
                            className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.12em] text-moxie-charcoal/50 transition hover:text-moxie-orange"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form
            action={addTeamMember}
            className="mt-4 flex flex-wrap items-end gap-3 border border-moxie-border bg-white p-6"
          >
            <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "14rem" }}>
              <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Email address
              </span>
              <input
                type="email"
                name="email"
                required
                className="w-full border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Name
              </span>
              <input
                type="text"
                name="displayName"
                className="w-40 border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Role
              </span>
              <select
                name="role"
                className="border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
              >
                <option value="writer">Writer</option>
                <option value="publisher">Publisher</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                Password, new accounts only
              </span>
              <input
                type="text"
                name="password"
                placeholder="At least 8 characters"
                className="w-48 border border-moxie-border bg-white px-3 py-2 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
              />
            </label>
            <button
              type="submit"
              className="font-moxie-label bg-moxie-charcoal px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-charcoal/85"
            >
              Add to the team
            </button>
          </form>
          </>
          )}
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
