import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePagePlan, factsToText, type MemberFacts } from "@/lib/generated-page/generate";
import { generateComposedPlan } from "@/lib/generated-page/generate-composed";

// Development-only. Generates a page for a real member and writes it to
// src/lib/generated-page/samples/{slug}.json for the preview route.
//
// A route rather than a standalone script because the generator imports
// through the "@/" alias, which plain node does not resolve.
//
// Refuses to run outside development: it writes to the repo working tree,
// which is meaningless on a deployed server, and it spends money.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The tier split, agreed with Dewald 2026-07-31. Free-form layout is only
// worth its risk when there is real material to design around, so a member
// with photographs gets the composed grammar and a member without gets the
// safer prepared-section system.
//
// Deliberately counts the member's OWN photographs. Stock imagery can fill
// supporting slots but must never promote a member into the photo-led tier,
// or we recreate the generic look we just spent a sprint removing.
const PHOTO_TIER_THRESHOLD = 2;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Development only." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Pass ?slug=" }, { status: 400 });
  const forceTier = searchParams.get("tier");

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

  const { data: photoRows } = await admin
    .from("client_photos")
    .select("storage_path")
    .eq("growth_client_id", client.id)
    .order("position", { ascending: true });

  const photos = photoRows ?? [];
  const photoUrls = photos.map(
    (p) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos/${p.storage_path}`
  );

  const facts: MemberFacts = {
    businessName: client.business_name,
    industry: client.industry,
    city: client.city,
    province: client.province,
    businessDescription: client.business_description,
    tagline: client.tagline,
    productsServices: client.products_services,
    additionalNotes: client.additional_notes,
    hasLogo: Boolean(client.logo_path),
    photoCount: photos.length,
  };

  const tier =
    forceTier === "composed" || forceTier === "sections"
      ? forceTier
      : photos.length >= PHOTO_TIER_THRESHOLD
        ? "composed"
        : "sections";

  const started = Date.now();

  if (tier === "composed") {
    const result = await generateComposedPlan(
      facts,
      factsToText(facts),
      // The member's existing photographs have no briefs attached, so the
      // model is told how many exist and composes around that count. Mapping
      // real photos onto the slots it produces happens at render time, in
      // order. Proper per-photo descriptions are Handoff 03's job.
      photos.map((_, i) => `Photograph ${i + 1} of their own work, already uploaded.`)
    );
    const seconds = Number(((Date.now() - started) / 1000).toFixed(1));
    if (!result.ok) return NextResponse.json({ slug, tier, ok: false, seconds, error: result.error });

    writeSample(slug, {
      slug,
      tier,
      businessName: client.business_name,
      brandColor: client.brand_primary_color,
      photoUrls,
      generatedAt: new Date().toISOString(),
      plan: result.plan,
    });

    return NextResponse.json({
      slug,
      tier,
      ok: true,
      seconds,
      photoCount: photos.length,
      palette: result.plan.palette,
      typePairing: result.plan.typePairing,
      grids: result.plan.sections.map((s) => `${s.columns}col/${s.band}/${s.width}`),
      rationale: result.plan.rationale,
    });
  }

  const result = await generatePagePlan(facts);
  const seconds = Number(((Date.now() - started) / 1000).toFixed(1));
  if (!result.ok) return NextResponse.json({ slug, tier, ok: false, seconds, error: result.error });

  writeSample(slug, {
    slug,
    tier,
    businessName: client.business_name,
    brandColor: client.brand_primary_color,
    photoUrls,
    generatedAt: new Date().toISOString(),
    plan: result.plan,
  });

  return NextResponse.json({
    slug,
    tier,
    ok: true,
    seconds,
    photoCount: photos.length,
    palette: result.plan.palette,
    typePairing: result.plan.typePairing,
    rhythm: result.plan.rhythm,
    sections: result.plan.sections.map((s) => ("layout" in s ? `${s.type}:${s.layout}` : s.type)),
    rationale: result.plan.rationale,
  });
}

function writeSample(slug: string, payload: unknown) {
  const dir = path.join(process.cwd(), "src/lib/generated-page/samples");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(payload, null, 2));
}
