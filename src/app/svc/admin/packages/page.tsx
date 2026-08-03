import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";

export const metadata: Metadata = {
  title: "Packages",
  robots: { index: false, follow: false },
};

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: packages } = await db
    .from("package")
    .select("id, lineage_id, version, brand, name, slug, monthly_price_cents, active, is_current, created_at")
    .order("brand")
    .order("display_order")
    .order("version", { ascending: false });

  const adminHref = await svcPath("/admin");
  const builderHref = await svcPath("/admin/packages/builder");

  const current = (packages ?? []).filter((p) => p.is_current);
  const history = (packages ?? []).filter((p) => !p.is_current);

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Packages</h1>

        {(params.saved || params.error) && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm">
            {params.saved && `Saved "${params.saved}" as the new current version.`}
            {params.error === "benefits" && "Pick at least one benefit before saving."}
            {params.error === "fields" && "The package needs a name and a price above zero."}
            {params.error && !["benefits", "fields"].includes(params.error) && "That did not save; try again."}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {current.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-2 border-svc-ink/15 bg-white/60 p-5">
              <div>
                <h2 className="font-svc-heading text-lg font-bold">{p.name}</h2>
                <p className="text-sm text-svc-ink/60">
                  {p.brand === "svc" ? "Smart Value Club" : "Moxie"} | {formatRand(p.monthly_price_cents)} a month |
                  version {p.version}
                </p>
              </div>
              <Link
                href={`${builderHref}?from=${p.id}`}
                className="inline-flex min-h-11 items-center border-2 border-svc-green px-4 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
              >
                Open in the builder
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Link
            href={builderHref}
            className="inline-flex min-h-12 items-center justify-center bg-svc-green px-6 text-base font-semibold text-white hover:bg-svc-ink"
          >
            Build a new package
          </Link>
        </div>

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="font-svc-heading text-lg font-bold">Version history</h2>
            <ul className="mt-2 space-y-1 text-sm text-svc-ink/70">
              {history.map((p) => (
                <li key={p.id}>
                  {p.name} v{p.version}, {formatRand(p.monthly_price_cents)},{" "}
                  {new Date(p.created_at).toLocaleDateString("en-ZA")} (members on this version stay on it)
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
