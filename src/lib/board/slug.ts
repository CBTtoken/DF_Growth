import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

// A post's URL is /board/post/<slug>, and the slug comes from the title,
// because "solar-geyser-installed-in-centurion" is worth more to a crawler
// and to a person reading a link in a WhatsApp group than a uuid is.
//
// Two members can absolutely post "December special", so the slug is
// checked against the table and gets a short suffix when it is taken. The
// suffix is only added on an actual collision rather than always, so most
// posts keep a clean address.
//
// This does not share slug-namespace.ts with business and agent pages.
// Those all resolve at the site root, where they genuinely compete for the
// same addresses. A board post lives two segments deep under /board/post/,
// which no business slug can ever reach.
const MAX_SLUG_LENGTH = 70;

export async function buildPostSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "") || "post";
  const admin = createAdminClient();

  const { data: existing } = await admin.from("board_posts").select("slug").eq("slug", base).maybeSingle();
  if (!existing) return base;

  // Four hex characters is 65,536 combinations against a base that already
  // has to be an exact title match to get here. Looped rather than trusted,
  // since the column is unique and an insert failure would lose the post a
  // member just wrote.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${Math.random().toString(16).slice(2, 6)}`;
    const { data: taken } = await admin.from("board_posts").select("slug").eq("slug", candidate).maybeSingle();
    if (!taken) return candidate;
  }

  // Nothing sensible is left to try, so fall back to something that cannot
  // collide at all rather than failing the member's post.
  return `${base}-${Date.now().toString(36)}`;
}
