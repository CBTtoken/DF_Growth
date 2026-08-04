// Google merged "Big Shoulders Display" into the Big_Shoulders family;
// this Next version exposes it under the merged name.
import { Big_Shoulders, DM_Mono, Instrument_Sans } from "next/font/google";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomPageProps } from "@/lib/custom-pages/registry";
import { OldGoodExperience, type OgItem } from "./OldGoodExperience";
import { OG_CSS } from "./og-styles";

/**
 * Old Good: a demo thrift storefront, built as a surprise for Jordan Rosema
 * (Jordan/HANDOFF_old_good_demo.md). Everything on the page is sample data
 * and the page says so; the products are real shop_products records so the
 * dashboard drives the rail the moment Jordan's account is linked.
 *
 * The design brief is Jordan/thrift-shop-demo.html: indigo and fluoro,
 * cardboard swing tickets on a rail, condition grades with the flaw written
 * out, measurements in centimetres, sold stamps that stay up.
 *
 * Thrift metadata rides inside each product's ordinary description as
 * plain "Key: value" lines (Grade, Flaw, Fabric, Era, Rail, Shape, and any
 * "Something: 12 cm" measurement). A member can type those in the normal
 * dashboard form with no new UI, and any line that isn't metadata renders
 * as the item's own words. That is the whole integration: no new tables,
 * no engine changes.
 */

// The CSP blocks Google's font CDN (font-src 'self' data:), so the faces
// self-host through next/font. Module scope, per next/font's requirement.
const ogDisplay = Big_Shoulders({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--og-disp" });
const ogMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--og-mono" });
const ogBody = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--og-body" });

import { OG_MARKETS, OG_DELIVERY, OG_FREE_OVER_CENTS } from "./og-data";

type ParsedMeta = {
  grade: string;
  flaw: string;
  fabric: string;
  era: string;
  cat: string;
  shape: string;
  measurements: [string, string][];
  blurb: string;
};

/** Plain "Key: value" lines out of an ordinary product description. */
function parseThriftMeta(description: string | null): ParsedMeta {
  const meta: ParsedMeta = { grade: "", flaw: "", fabric: "", era: "", cat: "Rail", shape: "top", measurements: [], blurb: "" };
  const blurbLines: string[] = [];
  for (const raw of (description ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (!m) {
      blurbLines.push(line);
      continue;
    }
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key === "grade") meta.grade = value.slice(0, 1).toUpperCase();
    else if (key === "flaw") meta.flaw = value;
    else if (key === "fabric") meta.fabric = value;
    else if (key === "era") meta.era = value;
    else if (key === "rail" || key === "category") meta.cat = value;
    else if (key === "shape") meta.shape = value.toLowerCase();
    else if (/\bcm\b/.test(value)) meta.measurements.push([m[1].trim(), value]);
    else blurbLines.push(line);
  }
  meta.blurb = blurbLines.join(" ");
  return meta;
}

export async function OldGoodPage({ clientId, businessName, contactEmail }: CustomPageProps) {
  const admin = createAdminClient();

  const { data: products } = await admin
    .from("shop_products")
    .select(
      "id, slug, title, description, base_price_cents, image_paths, track_stock, status, position, created_at, shop_product_variants(id, stock_quantity, is_active)"
    )
    .eq("growth_client_id", clientId)
    .eq("status", "active")
    .order("position", { ascending: true });

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shop-products`;

  const items: OgItem[] = (products ?? []).map((p, i) => {
    const meta = parseThriftMeta(p.description);
    const variants = (p.shop_product_variants ?? []).filter((v) => v.is_active);
    const variant = variants[0] ?? null;
    const sold = p.track_stock && (variant?.stock_quantity ?? 0) <= 0;
    return {
      id: p.id,
      slug: p.slug,
      no: String(i + 1).padStart(3, "0"),
      name: p.title,
      priceCents: p.base_price_cents,
      photo: p.image_paths?.[0] ? `${storageBase}/${p.image_paths[0]}` : null,
      sold,
      variantId: variant?.id ?? null,
      cat: meta.cat,
      shape: meta.shape,
      grade: meta.grade,
      flaw: meta.flaw,
      fabric: meta.fabric,
      era: meta.era,
      measurements: meta.measurements,
      blurb: meta.blurb,
    };
  });

  return (
    <div className={`${ogDisplay.variable} ${ogMono.variable} ${ogBody.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: OG_CSS }} />
      <OldGoodExperience
        clientId={clientId}
        businessName={businessName}
        contactEmail={contactEmail}
        items={items}
        markets={OG_MARKETS}
        delivery={OG_DELIVERY}
        freeOverCents={OG_FREE_OVER_CENTS}
      />
    </div>
  );
}
