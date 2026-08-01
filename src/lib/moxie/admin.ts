import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReader } from "@/lib/moxie/entitlement";

// Who may publish. Both of Dewald's addresses, exactly as the eMag builder
// grants publisher rights on both, so whichever he happens to be signed in
// as works and he is never locked out of his own magazine.
//
// A list rather than a table because there is one publisher and adding a
// second is a code change somebody should have to think about. When Moxie
// has staff, this becomes a role on a row and this constant goes away.
const PUBLISHERS = new Set(["dewald@digitalflyer.co.za", "info@digitalflyer.co.za"]);

export async function requirePublisher(): Promise<{ id: string; email: string } | null> {
  const reader = await getReader();
  if (!reader) return null;
  return PUBLISHERS.has(reader.email.toLowerCase()) ? reader : null;
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
