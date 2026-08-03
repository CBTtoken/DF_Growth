import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { rateForBenefit, redemptionRate } from "@/lib/svc/rates";
import { periodFor } from "@/lib/svc/ledger";
import { PackageBuilder, type BuilderBenefit, type BuilderInitial } from "@/components/svc/PackageBuilder";
import { savePackageVersion } from "../actions";

export const metadata: Metadata = {
  title: "Package builder",
  robots: { index: false, follow: false },
};

// The server half of the builder: loads the catalogue with each benefit's
// current rate and redemption information once, and hands the arithmetic
// to the client component. Opening from an existing package seeds its
// values and saving creates the next version on its lineage.
export default async function PackageBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const period = periodFor();

  const { data: benefits } = await db
    .from("benefit")
    .select("id, name, benefit_type")
    .eq("active", true)
    .order("name");

  const catalogue: BuilderBenefit[] = [];
  for (const b of benefits ?? []) {
    const rate = await rateForBenefit(b.id, period);
    const redemption =
      rate?.cost_model === "per_redemption" ? await redemptionRate(b.id) : null;
    catalogue.push({
      id: b.id,
      name: b.name,
      benefitType: b.benefit_type,
      costModel: rate?.cost_model ?? "no_rate",
      rateCents: rate?.rate_cents ?? null,
      revSharePercent: rate?.revenue_share_percent != null ? Number(rate.revenue_share_percent) : null,
      redemptionRate: redemption?.rate ?? 0,
      redemptionSource: redemption?.source ?? "none",
      defaultFaceCents: 0,
    });
  }

  let initial: BuilderInitial = {
    lineageId: null,
    version: 1,
    name: "",
    brand: "svc",
    monthlyPriceRand: 49,
    selected: {},
    referralRands: { l1: 5, l2: 2.5, l3: 1.5 },
  };

  if (params.from) {
    const { data: from } = await db
      .from("package")
      .select(
        "id, lineage_id, version, name, brand, monthly_price_cents, package_benefit (benefit_id, face_value_cents), referral_rate (level, monthly_amount_cents)"
      )
      .eq("id", params.from)
      .maybeSingle();
    if (from) {
      const selected: Record<string, number> = {};
      for (const pb of (from.package_benefit as unknown as { benefit_id: string; face_value_cents: number }[]) ?? []) {
        selected[pb.benefit_id] = pb.face_value_cents;
        const cat = catalogue.find((c) => c.id === pb.benefit_id);
        if (cat) cat.defaultFaceCents = pb.face_value_cents;
      }
      const refRows = (from.referral_rate as unknown as { level: number; monthly_amount_cents: number }[]) ?? [];
      initial = {
        lineageId: from.lineage_id,
        version: from.version + 1,
        name: from.name,
        brand: from.brand,
        monthlyPriceRand: from.monthly_price_cents / 100,
        selected,
        referralRands: {
          l1: (refRows.find((r) => r.level === 1)?.monthly_amount_cents ?? 0) / 100,
          l2: (refRows.find((r) => r.level === 2)?.monthly_amount_cents ?? 0) / 100,
          l3: (refRows.find((r) => r.level === 3)?.monthly_amount_cents ?? 0) / 100,
        },
      };
    }
  }

  const packagesHref = await svcPath("/admin/packages");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link href={packagesHref} className="text-sm font-semibold text-svc-blue underline">
          All packages
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">
          {initial.lineageId ? `New version of ${initial.name}` : "Build a package"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-svc-ink/70">
          The panel updates as you type and nothing is saved until you press
          save. The referral exposure sits inside the margin, where it
          belongs.
        </p>
        <div className="mt-6">
          <PackageBuilder catalogue={catalogue} initial={initial} saveAction={savePackageVersion} />
        </div>
      </div>
    </div>
  );
}
