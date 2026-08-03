import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { demandSummary } from "@/lib/svc/fraud";

export const metadata: Metadata = {
  title: "Demand capture",
  robots: { index: false, follow: false },
};

// The aggregated demand view (handoff 7.4): which deal to chase next,
// with a number attached.
export default async function AdminDemandPage() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const { byCategory, recent } = await demandSummary();
  const adminHref = await svcPath("/admin");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">What members are asking for</h1>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">By category, most asked first</h2>
          {byCategory.length === 0 ? (
            <p className="mt-2 text-sm text-svc-ink/60">
              Nothing yet. The question sits on every member&apos;s dashboard;
              answers land here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {byCategory.map((c) => (
                <li key={c.category} className="flex items-center justify-between border-b border-svc-ink/10 pb-2 text-sm">
                  <span className="font-semibold capitalize">{c.category.replace(/_/g, " ")}</span>
                  <span className="font-svc-heading text-lg font-bold text-svc-green">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Latest asks</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {recent.map((r, i) => (
              <li key={i} className="border-l-4 border-svc-blue pl-3">
                <span className="font-semibold capitalize">{r.category.replace(/_/g, " ")}</span>: {r.message}
                <span className="block text-xs text-svc-ink/50">
                  {r.memberName}, {new Date(r.created_at).toLocaleDateString("en-ZA")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
