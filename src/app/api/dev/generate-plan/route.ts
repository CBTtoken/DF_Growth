import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePagePlan } from "@/lib/generated-page/generate";

// Development-only. Generates a page plan for a real member and writes it to
// src/lib/generated-page/samples/{slug}.json for the preview route to render.
//
// A route rather than a standalone node script because the generator imports
// through the "@/" alias, which plain node does not resolve and which is not
// worth contorting the source to work around for a proof of concept.
//
// Refuses to run outside development. It writes to the repo working tree,
// which is meaningless on a deployed server, and it spends money.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Development only." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Pass ?slug=" }, { status: 400 });

  const admin = createAdminClient();
  const { data: client, error } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, industry, city, province, business_description, tagline, products_services, additional_notes, logo_path, brand_primary_color"
    )
    .eq("slug", slug)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: error?.message ?? "Member not found" }, { status: 404 });
  }

  const { count } = await admin
    .from("client_photos")
    .select("id", { count: "exact", head: true })
    .eq("growth_client_id", client.id);

  const started = Date.now();
  const result = await generatePagePlan({
    businessName: client.business_name,
    industry: client.industry,
    city: client.city,
    province: client.province,
    businessDescription: client.business_description,
    tagline: client.tagline,
    productsServices: client.products_services,
    additionalNotes: client.additional_notes,
    hasLogo: Boolean(client.logo_path),
    photoCount: count ?? 0,
  });
  const seconds = Number(((Date.now() - started) / 1000).toFixed(1));

  if (!result.ok) {
    return NextResponse.json({ slug, ok: false, seconds, error: result.error }, { status: 200 });
  }

  const dir = path.join(process.cwd(), "src/lib/generated-page/samples");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${slug}.json`),
    JSON.stringify(
      {
        slug,
        businessName: client.business_name,
        brandColor: client.brand_primary_color,
        generatedAt: new Date().toISOString(),
        plan: result.plan,
      },
      null,
      2
    )
  );

  return NextResponse.json({
    slug,
    ok: true,
    seconds,
    palette: result.plan.palette,
    typePairing: result.plan.typePairing,
    rhythm: result.plan.rhythm,
    sections: result.plan.sections.map((s) => ("layout" in s ? `${s.type}:${s.layout}` : s.type)),
    bands: result.plan.sections.map((s) => ("band" in s ? s.band : "-")),
    rationale: result.plan.rationale,
  });
}
