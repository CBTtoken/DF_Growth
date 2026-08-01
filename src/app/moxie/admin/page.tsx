import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { listEditionsForAdmin, membershipSummary, requirePublisher } from "@/lib/moxie/admin";
import { moxiePath } from "@/lib/moxie/host";
import { createCodeBatch } from "./actions";

export const metadata: Metadata = {
  title: "Publisher",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MoxieAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const { created, error } = await searchParams;
  const publisher = await requirePublisher();
  if (!publisher) redirect(await moxiePath("/login?next=/admin"));

  const [editions, members, csvBase] = await Promise.all([
    listEditionsForAdmin(),
    membershipSummary(),
    moxiePath("/admin/codes"),
  ]);

  const stats = [
    { label: "Active members", value: members.active },
    { label: "On annual", value: members.annual },
    { label: "Payment failed", value: members.pastDue },
    { label: "Cancelled", value: members.cancelled },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn />

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
            Publisher
          </p>
          <h1 className="font-moxie-display mt-2 text-3xl font-bold text-moxie-charcoal">
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

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="border border-moxie-border bg-white p-5">
                <p className="font-moxie-display text-3xl font-bold text-moxie-charcoal">
                  {s.value}
                </p>
                <p className="font-moxie-label mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

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
                  <div className="text-right">
                    <p className="font-moxie-display text-lg font-bold text-moxie-charcoal">
                      {e.codesRedeemed} / {e.codesTotal}
                    </p>
                    <p className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/55">
                      codes redeemed
                    </p>
                  </div>
                </div>

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
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
