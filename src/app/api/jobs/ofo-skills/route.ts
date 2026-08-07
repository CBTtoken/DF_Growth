// Skills for the CV builder's skills step, scoped to the branch of the
// occupations the person actually chose. The caller sends occupation codes;
// the sub-major group is derived here from the code's first two digits, and
// only those groups' skills come back -- the cross-branch guarantee lives in
// the jobs_ofo_skills FK, this route just walks it.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codesParam = (searchParams.get("occupations") ?? "").trim();
  const codes = codesParam
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\d{6}$/.test(c))
    .slice(0, 3);

  if (codes.length === 0) {
    return NextResponse.json({ skills: [] });
  }

  const subMajors = [...new Set(codes.map((c) => c.slice(0, 2)))];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs_ofo_skills")
    .select("label, sub_major_code")
    .in("sub_major_code", subMajors)
    .order("label");

  if (error) {
    console.error("ofo-skills failed", error);
    return NextResponse.json({ skills: [] }, { status: 500 });
  }

  // One flat de-duplicated list: with up to three occupations the person
  // does not care which branch a skill technically belongs to.
  const skills = [...new Set((data ?? []).map((r) => r.label))];

  return NextResponse.json(
    { skills },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
