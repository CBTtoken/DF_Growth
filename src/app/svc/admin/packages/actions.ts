"use server";

import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";

/**
 * Saving from the package builder creates a NEW VERSION on the same
 * lineage (handoff 7.2): the previous version keeps its members and
 * loses only its is_current flag, so nobody's package changes under
 * them. A brand new package starts its own lineage at version 1.
 */
export async function savePackageVersion(formData: FormData) {
  const admin = await getSvcAdmin();
  if (!admin) redirect(await svcPath("/login"));

  const name = String(formData.get("name") ?? "").trim();
  const brand = formData.get("brand") === "moxie" ? "moxie" : "svc";
  const priceRand = Number(String(formData.get("price") ?? "0").replace(",", "."));
  const lineage = String(formData.get("lineage") ?? "").trim();
  const version = Number(formData.get("version") ?? 1);
  const refL1 = Number(String(formData.get("ref_l1") ?? "0").replace(",", "."));
  const refL2 = Number(String(formData.get("ref_l2") ?? "0").replace(",", "."));
  const refL3 = Number(String(formData.get("ref_l3") ?? "0").replace(",", "."));

  let selected: Record<string, number> = {};
  try {
    selected = JSON.parse(String(formData.get("payload") ?? "{}")).selected ?? {};
  } catch {
    redirect(`${await svcPath("/admin/packages")}?error=payload`);
  }

  const backHref = await svcPath("/admin/packages");
  if (!name || !Number.isFinite(priceRand) || priceRand <= 0) redirect(`${backHref}?error=fields`);
  if (Object.keys(selected).length === 0) redirect(`${backHref}?error=benefits`);

  const db = createSvcClient();

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = lineage ? `${slugBase}` : `${slugBase}`;

  if (lineage) {
    // The old current version steps back, keeping its members.
    await db.from("package").update({ is_current: false }).eq("lineage_id", lineage).eq("is_current", true);
  }

  const insertValues: Record<string, unknown> = {
    brand,
    name,
    slug,
    monthly_price_cents: Math.round(priceRand * 100),
    active: true,
    is_current: true,
    version,
  };
  if (lineage) insertValues.lineage_id = lineage;

  const { data: pkg, error } = await db.from("package").insert(insertValues).select("id").single();
  if (error || !pkg) {
    console.error("SVC package version insert failed", error);
    redirect(`${backHref}?error=save`);
  }

  const benefitRows = Object.entries(selected).map(([benefit_id, face_value_cents], i) => ({
    package_id: pkg!.id,
    benefit_id,
    display_order: i + 1,
    face_value_cents: Math.max(0, Math.round(Number(face_value_cents) || 0)),
  }));
  const { error: pbError } = await db.from("package_benefit").insert(benefitRows);
  if (pbError) console.error("SVC package benefits insert failed", pbError);

  const refRows = (
    [
      [1, refL1],
      [2, refL2],
      [3, refL3],
    ] as const
  )
    .filter(([, rand]) => Number.isFinite(rand) && rand > 0)
    .map(([level, rand]) => ({
      package_id: pkg!.id,
      level,
      monthly_amount_cents: Math.round(rand * 100),
    }));
  if (refRows.length > 0) {
    const { error: refError } = await db.from("referral_rate").insert(refRows);
    if (refError) console.error("SVC referral rates insert failed", refError);
  }

  redirect(`${backHref}?saved=${encodeURIComponent(name)}`);
}
