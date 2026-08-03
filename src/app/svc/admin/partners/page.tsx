import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";

export const metadata: Metadata = {
  title: "Partners",
  robots: { index: false, follow: false },
};

export default async function AdminPartnersPage() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: partners } = await db
    .from("partner")
    .select("id, name, contact_person, active, benefit (id)")
    .order("name");

  const adminHref = await svcPath("/admin");
  const partnerBase = await svcPath("/admin/partners");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Partners</h1>
        <p className="mt-2 text-sm text-svc-ink/70">
          Open a partner for its benefits, rates, voucher batches and monthly
          reports.
        </p>

        <div className="mt-6 space-y-3">
          {(partners ?? []).map((p) => (
            <Link
              key={p.id}
              href={`${partnerBase}/${p.id}`}
              className="flex items-center justify-between border-2 border-svc-ink/15 bg-white/60 p-5 hover:border-svc-green"
            >
              <div>
                <h2 className="font-svc-heading text-lg font-bold">{p.name}</h2>
                <p className="text-sm text-svc-ink/60">
                  {(p.benefit as unknown as { id: string }[] | null)?.length ?? 0} benefits
                  {p.contact_person ? ` | ${p.contact_person}` : ""}
                </p>
              </div>
              <span className={`text-xs font-bold uppercase ${p.active ? "text-svc-green" : "text-svc-ink/40"}`}>
                {p.active ? "Active" : "Inactive"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
