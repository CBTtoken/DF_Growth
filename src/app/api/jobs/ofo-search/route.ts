// Type-ahead search over the OFO 2021 occupation list, backing the shared
// occupation picker on both the CV builder and the vacancy composer.
//
// A server route rather than a shipped list: 1,511 occupations plus 5,946
// specialisation synonyms is far too much to send to a phone on expensive
// data for one dropdown. The tables are pure reference data (world-readable,
// seeded by migration), so the whole response is CDN-cacheable per query.
//
// Matching: a straight substring match over official titles and
// specialisation titles, merged so an occupation found through a synonym
// reports which synonym matched ("Councillor" -> Local or Provincial
// Government Legislator). Ranking is done here in plain code, not SQL:
// prefix matches first, then shorter titles, which is what makes "plumb"
// put Plumber above Sales Representative (Building and Plumbing Supplies).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OfoSearchResult = {
  code: string;
  title: string;
  /** The specialisation title the match came through, when not the official title. */
  via: string | null;
};

const MAX_RESULTS = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAdminClient();
  const [occRes, specRes] = await Promise.all([
    supabase
      .from("jobs_ofo_occupations")
      .select("code, title")
      .ilike("title", `%${q}%`)
      .limit(40),
    supabase
      .from("jobs_ofo_specialisations")
      .select("occupation_code, title, jobs_ofo_occupations(title)")
      .ilike("title", `%${q}%`)
      .limit(40),
  ]);

  if (occRes.error || specRes.error) {
    console.error("ofo-search failed", occRes.error ?? specRes.error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  const lower = q.toLowerCase();
  const rank = (matchedTitle: string) => {
    const t = matchedTitle.toLowerCase();
    if (t === lower) return 0;
    if (t.startsWith(lower)) return 1;
    // A word inside the title starting with the query beats a mid-word hit.
    if (t.includes(` ${lower}`) || t.includes(`(${lower}`)) return 2;
    return 3;
  };

  type Candidate = OfoSearchResult & { matched: string };
  const byCode = new Map<string, Candidate>();

  // One entry per occupation, keeping whichever match ranks best. A synonym
  // can outrank the official title: typing "cashier" must put Office
  // Cashier first through its exact "Cashier" specialisation, not bury it
  // behind partial title matches.
  const consider = (candidate: Candidate) => {
    const existing = byCode.get(candidate.code);
    if (
      !existing ||
      rank(candidate.matched) < rank(existing.matched) ||
      (rank(candidate.matched) === rank(existing.matched) &&
        candidate.matched.length < existing.matched.length)
    ) {
      byCode.set(candidate.code, candidate);
    }
  };

  for (const row of occRes.data) {
    consider({ code: row.code, title: row.title, via: null, matched: row.title });
  }
  for (const row of specRes.data) {
    const official = Array.isArray(row.jobs_ofo_occupations)
      ? row.jobs_ofo_occupations[0]
      : row.jobs_ofo_occupations;
    if (!official) continue;
    consider({
      code: row.occupation_code,
      title: official.title,
      via: row.title,
      matched: row.title,
    });
  }

  const results = [...byCode.values()]
    .sort(
      (a, b) =>
        rank(a.matched) - rank(b.matched) ||
        a.matched.length - b.matched.length ||
        a.matched.localeCompare(b.matched)
    )
    .slice(0, MAX_RESULTS)
    .map(({ code, title, via }) => ({ code, title, via }));

  // Reference data changes only by migration; let the CDN keep each query.
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
