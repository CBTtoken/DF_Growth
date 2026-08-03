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

/**
 * Anyone on the team may look at the dashboard.
 *
 * Dewald, 3 August: "can writer also have access to admin panel, just not
 * publish the edition". So the door opens for any emag_members row and the
 * page decides what to show; the levers (codes, team changes) stay behind
 * requirePublisher, enforced in the actions themselves rather than only by
 * hidden buttons. Publishing an edition was never on this screen: that
 * lives in Kwaai Press, where a writer already cannot approve.
 */
export async function requireTeamAccess(): Promise<
  { id: string; email: string; role: "writer" | "publisher" } | null
> {
  const reader = await getReader();
  if (!reader) return null;
  if (OWNER_EMAILS.has(reader.email.toLowerCase())) return { ...reader, role: "publisher" };

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
    .maybeSingle();
  if (!data) return null;
  return { ...reader, role: data.role as "writer" | "publisher" };
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

/**
 * The magazine owner's questions, answered from real rows only.
 *
 * Dewald, 3 August: "what is really important for a magazine owner to see
 * and do from admin... who read the magazine, signed up but did not pay,
 * dropped off, active, income, readers stats". Every number here has a
 * table behind it, and the two counters whose history only starts today
 * (reads, tagged reader accounts) say so on the screen rather than
 * pretending to know the past.
 */
export type OwnerStats = {
  readsTotal: number;
  reads30d: number;
  uniqueSignedInReaders: number;
  readerAccounts: number;
  readersNeverPaid: number;
  incomeByMonth: { month: string; cents: number }[];
  incomeThisMonthCents: number;
  incomeLastMonthCents: number;
  editionReads: { editionId: string; total: number; last30d: number }[];
};

export async function ownerStats(): Promise<OwnerStats> {
  const admin = createAdminClient();
  const cutoff30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: reads }, { data: billing }, { data: purchases }, { data: subs }] = await Promise.all([
    admin.from("moxie_reads").select("edition_id, user_id, created_at"),
    admin.from("moxie_billing_events").select("amount_cents, created_at"),
    admin.from("moxie_purchases").select("amount_cents, created_at, status"),
    admin.from("moxie_subscriptions").select("user_id"),
  ]);

  const readRows = reads ?? [];
  const readsTotal = readRows.length;
  const reads30d = readRows.filter((r) => r.created_at >= cutoff30).length;
  const uniqueSignedInReaders = new Set(readRows.filter((r) => r.user_id).map((r) => r.user_id)).size;

  const editionMap = new Map<string, { total: number; last30d: number }>();
  for (const r of readRows) {
    const entry = editionMap.get(r.edition_id) ?? { total: 0, last30d: 0 };
    entry.total += 1;
    if (r.created_at >= cutoff30) entry.last30d += 1;
    editionMap.set(r.edition_id, entry);
  }

  // Reader accounts: tagged at signup from 3 August 2026. Paged the same
  // way every auth listing on this project is, and matched locally.
  const everSubscribed = new Set((subs ?? []).map((s) => s.user_id));
  let readerAccounts = 0;
  let readersNeverPaid = 0;
  let page = 1;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data.users) {
      if (u.user_metadata?.moxie_reader) {
        readerAccounts += 1;
        if (!everSubscribed.has(u.id)) readersNeverPaid += 1;
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }

  // Income: real money movements only. Billing events are the webhook's
  // record of subscription charges; purchases count once paid. A manually
  // granted membership carries no event, so it never inflates this.
  const money: { cents: number; at: string }[] = [
    ...(billing ?? []).map((b) => ({ cents: b.amount_cents ?? 0, at: b.created_at })),
    ...(purchases ?? [])
      .filter((p) => p.status === "paid")
      .map((p) => ({ cents: p.amount_cents ?? 0, at: p.created_at })),
  ];

  const monthKey = (iso: string) => iso.slice(0, 7);
  const now = new Date();
  const incomeByMonth: { month: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    incomeByMonth.push({
      month: d.toLocaleDateString("en-ZA", { month: "short", year: i >= 11 ? "numeric" : undefined, timeZone: "UTC" }),
      cents: money.filter((m) => monthKey(m.at) === key).reduce((s, m) => s + m.cents, 0),
    });
  }

  return {
    readsTotal,
    reads30d,
    uniqueSignedInReaders,
    readerAccounts,
    readersNeverPaid,
    incomeByMonth,
    incomeThisMonthCents: incomeByMonth[5]?.cents ?? 0,
    incomeLastMonthCents: incomeByMonth[4]?.cents ?? 0,
    editionReads: [...editionMap.entries()].map(([editionId, v]) => ({ editionId, ...v })),
  };
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
