import "server-only";

import { createSvcClient } from "@/lib/svc/db";

/**
 * Public catalogue reads. Everything the marketing site renders comes from
 * here, which is what makes a price change a database edit rather than a
 * deploy (handoff Sprint 1: packages render from the database, no
 * hard-coded prices or benefit lists).
 *
 * Every function degrades to an empty result rather than throwing, because
 * the code lands before the migration runs on the live project (house rule:
 * verify the migration exists live before pushing dependent code to main).
 * The pages render an honest "being finalised" state instead of crashing.
 */

export type SvcBenefit = {
  id: string;
  name: string;
  description: string | null;
  benefit_type: string;
  face_value_cents: number;
  display_order: number;
};

export type SvcPackage = {
  id: string;
  brand: string;
  name: string;
  slug: string;
  public_description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  free_draw_entries: number;
  display_order: number;
  benefits: SvcBenefit[];
  faceValueCents: number;
};

type PackageRow = Omit<SvcPackage, "benefits" | "faceValueCents"> & {
  package_benefit: {
    display_order: number;
    face_value_cents: number;
    benefit: {
      id: string;
      name: string;
      description: string | null;
      benefit_type: string;
      active: boolean;
    } | null;
  }[];
};

function shapePackage(row: PackageRow): SvcPackage {
  const benefits: SvcBenefit[] = (row.package_benefit ?? [])
    .filter((pb) => pb.benefit && pb.benefit.active)
    .map((pb) => ({
      id: pb.benefit!.id,
      name: pb.benefit!.name,
      description: pb.benefit!.description,
      benefit_type: pb.benefit!.benefit_type,
      face_value_cents: pb.face_value_cents,
      display_order: pb.display_order,
    }))
    .sort((a, b) => a.display_order - b.display_order);

  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    slug: row.slug,
    public_description: row.public_description,
    monthly_price_cents: row.monthly_price_cents,
    annual_price_cents: row.annual_price_cents,
    free_draw_entries: row.free_draw_entries,
    display_order: row.display_order,
    benefits,
    faceValueCents: benefits.reduce((sum, b) => sum + b.face_value_cents, 0),
  };
}

const PACKAGE_SELECT =
  "id, brand, name, slug, public_description, monthly_price_cents, annual_price_cents, free_draw_entries, display_order, " +
  "package_benefit (display_order, face_value_cents, benefit (id, name, description, benefit_type, active))";

/** Current, active packages for a brand, in display order. */
export async function listPublicPackages(brand: "svc" | "moxie" = "svc"): Promise<SvcPackage[]> {
  try {
    const db = createSvcClient();
    const { data, error } = await db
      .from("package")
      .select(PACKAGE_SELECT)
      .eq("brand", brand)
      .eq("active", true)
      .eq("is_current", true)
      .order("display_order");
    if (error) {
      console.error("SVC package query failed", error);
      return [];
    }
    return ((data ?? []) as unknown as PackageRow[]).map(shapePackage);
  } catch (err) {
    console.error("SVC package query threw", err);
    return [];
  }
}

export async function getPackageBySlug(slug: string): Promise<SvcPackage | null> {
  try {
    const db = createSvcClient();
    const { data, error } = await db
      .from("package")
      .select(PACKAGE_SELECT)
      .eq("slug", slug)
      .eq("active", true)
      .eq("is_current", true)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("SVC package lookup failed", error);
      return null;
    }
    return shapePackage(data as unknown as PackageRow);
  } catch (err) {
    console.error("SVC package lookup threw", err);
    return null;
  }
}

/** Whole Rand for clean values, cents shown only when they exist. */
export function formatRand(cents: number): string {
  const rand = cents / 100;
  const whole = Number.isInteger(rand);
  return `R${rand.toLocaleString("en-ZA", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}
