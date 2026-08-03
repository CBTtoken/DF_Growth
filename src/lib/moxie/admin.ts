import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReader } from "@/lib/moxie/entitlement";

// Who may publish.
//
// The original constant's own comment said "When Moxie has staff, this
// becomes a role on a row and this constant goes away." Moxie has staff
// now (3 August 2026), so it is a role on a row: a publisher is anyone
// holding an emag_members row with role 'publisher' for the Moxie
// publication, which is the same row that opens the Kwaai Press builder.
// One grant, both doors.
//
// Dewald's two addresses stay as a floor, not a ceiling: a bad edit to the
// team table must never lock the owner out of his own magazine.
const OWNER_EMAILS = new Set(["dewald@digitalflyer.co.za", "info@digitalflyer.co.za"]);

export async function requirePublisher(): Promise<{ id: string; email: string } | null> {
  const reader = await getReader();
  if (!reader) return null;
  if (OWNER_EMAILS.has(reader.email.toLowerCase())) return reader;

  const admin = createAdminClient();
  const { data: publication } = await admin
    .from("emag_publications")
    .select("id")
    .eq("slug", "moxie")
    .maybeSingle();
  if (!publication) return null;

  const { data } = await admin
    .from("emag_members")
    .select("role")
    .eq("user_id", reader.id)
    .eq("publication_id", publication.id)
    .eq("role", "publisher")
    .maybeSingle();
  return data ? reader : null;
}

export async function isPublisher(): Promise<boolean> {
  return (await requirePublisher()) !== null;
}

export type EditionAdminRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  free_from: string | null;
  codesTotal: number;
  codesRedeemed: number;
};

export async function listEditionsForAdmin(): Promise<EditionAdminRow[]> {
  const admin = createAdminClient();

  const { data: editions } = await admin
    .from("moxie_editions")
    .select("id, slug, title, status, published_at, free_from")
    .order("published_for", { ascending: false });

  const { data: codes } = await admin
    .from("moxie_access_codes")
    .select("edition_id, status");

  const counts = new Map<string, { total: number; redeemed: number }>();
  for (const c of codes ?? []) {
    const entry = counts.get(c.edition_id) ?? { total: 0, redeemed: 0 };
    entry.total += 1;
    if (c.status === "used") entry.redeemed += 1;
    counts.set(c.edition_id, entry);
  }

  return (editions ?? []).map((e) => ({
    ...e,
    codesTotal: counts.get(e.id)?.total ?? 0,
    codesRedeemed: counts.get(e.id)?.redeemed ?? 0,
  }));
}

export async function membershipSummary() {
  const admin = createAdminClient();
  const { data } = await admin.from("moxie_subscriptions").select("status, interval");
  const rows = data ?? [];
  return {
    active: rows.filter((r) => r.status === "active").length,
    pastDue: rows.filter((r) => r.status === "past_due").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    annual: rows.filter((r) => r.interval === "annual" && r.status === "active").length,
  };
}

export type MemberRow = {
  email: string;
  status: string;
  interval: string;
  started_at: string;
  current_period_end: string | null;
  cancelled_at: string | null;
};

/**
 * Every membership, newest first. Dewald, 3 August: "we can't see the
 * members, see their subscriptions and so on". This is the list the
 * KatisoBiz admin has and the Moxie admin did not.
 */
export async function listMembers(): Promise<MemberRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moxie_subscriptions")
    .select("email, status, interval, started_at, current_period_end, cancelled_at")
    .order("started_at", { ascending: false });
  return (data ?? []) as MemberRow[];
}

export type TeamRow = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "writer" | "publisher";
  createdAt: string;
};

/** The Moxie team: everyone holding an emag_members row for Moxie. */
export async function listTeam(): Promise<TeamRow[]> {
  const admin = createAdminClient();
  const { data: publication } = await admin
    .from("emag_publications")
    .select("id")
    .eq("slug", "moxie")
    .maybeSingle();
  if (!publication) return [];

  const { data } = await admin
    .from("emag_members")
    .select("user_id, role, display_name, created_at")
    .eq("publication_id", publication.id)
    .order("created_at", { ascending: true });

  const rows: TeamRow[] = [];
  for (const m of data ?? []) {
    // One lookup per row is fine at team scale; the alternative is paging
    // the whole auth user list for a handful of people.
    const { data: user } = await admin.auth.admin.getUserById(m.user_id);
    rows.push({
      userId: m.user_id,
      email: user?.user?.email ?? null,
      displayName: m.display_name,
      role: m.role as "writer" | "publisher",
      createdAt: m.created_at,
    });
  }
  return rows;
}

// Deliberately without I, O, 0 and 1. A code is read off a phone screen and
// typed by hand, and those four are the ones people get wrong. Losing them
// costs a little entropy and saves a support email, which is the right trade
// for something that is a latch rather than a secret.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function generateCodeBatch(
  editionId: string,
  count: number,
  label: string
): Promise<{ created: number }> {
  const admin = createAdminClient();
  const wanted = Math.max(1, Math.min(count, 2000));

  // Generated in one go and inserted with the unique (edition_id, code)
  // constraint doing the collision check. A duplicate inside the batch is
  // vanishingly unlikely at this alphabet and length, and if one happens the
  // insert simply produces fewer codes than asked for, which is reported
  // back rather than hidden.
  const rows = Array.from({ length: wanted }, () => ({
    edition_id: editionId,
    code: generateCode(),
    batch_label: label || null,
  }));

  const { data, error } = await admin
    .from("moxie_access_codes")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("generateCodeBatch failed", error);
    return { created: 0 };
  }
  return { created: data?.length ?? 0 };
}

export async function codesForEdition(editionId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moxie_access_codes")
    .select("code, status, batch_label, redeemed_at")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
