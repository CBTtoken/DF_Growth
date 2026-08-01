import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MoxieEditionStatus = "draft" | "coming_soon" | "published";

export type MoxieEdition = {
  id: string;
  slug: string;
  title: string;
  published_for: string;
  description: string | null;
  cover_path: string | null;
  emag_edition_id: string | null;
  pdf_path: string | null;
  price_cents: number;
  status: MoxieEditionStatus;
  published_at: string | null;
  free_from: string | null;
};

const COLUMNS =
  "id, slug, title, published_for, description, cover_path, emag_edition_id, pdf_path, price_cents, status, published_at, free_from";

// Every read goes through the service role client, because RLS is on with no
// policies for anon or authenticated. That is deliberate: entitlement here is
// not "is this row yours", it is a rule about four tables and a clock, and it
// lives in entitlement.ts rather than scattered across policies.

/** Editions a visitor may see listed, newest first. Drafts never appear. */
export async function listEditions(): Promise<MoxieEdition[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("moxie_editions")
    .select(COLUMNS)
    .in("status", ["published", "coming_soon"])
    .order("published_for", { ascending: false });

  if (error) {
    // Loud rather than an empty archive. A missing service_role grant on a
    // new table returns no rows and no error on this project, so the failure
    // that actually happens here is silent; anything that does surface an
    // error is worth seeing in the logs rather than rendering as "no
    // editions yet".
    console.error("listEditions failed", error);
    return [];
  }
  return (data ?? []) as MoxieEdition[];
}

export async function getEdition(slug: string): Promise<MoxieEdition | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("moxie_editions")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getEdition failed", slug, error);
    return null;
  }
  // A draft returns null rather than forbidden, so guessing a slug does not
  // reveal that next month's edition exists yet.
  if (!data || data.status === "draft") return null;
  return data as MoxieEdition;
}

/** The most recent published edition, which the home page leads with. */
export async function getLatestEdition(): Promise<MoxieEdition | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moxie_editions")
    .select(COLUMNS)
    .eq("status", "published")
    .order("published_for", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MoxieEdition) ?? null;
}

/** The next edition being worked on, shown as a teaser. */
export async function getComingEdition(): Promise<MoxieEdition | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moxie_editions")
    .select(COLUMNS)
    .eq("status", "coming_soon")
    .order("published_for", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as MoxieEdition) ?? null;
}

/**
 * A cover image URL. Editions seeded from the original PDFs carry a static
 * path under /public; anything uploaded later carries a storage key.
 * Distinguished by the leading slash rather than by a flag column, because a
 * flag would be one more thing to set correctly on every upload.
 */
export function coverUrl(edition: MoxieEdition): string | null {
  if (!edition.cover_path) return null;
  if (edition.cover_path.startsWith("/")) return edition.cover_path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/moxie-editions/${edition.cover_path}`;
}

/** "July 2026" reads better than a date, and it is what the archive is keyed on. */
export function editionLabel(edition: MoxieEdition): string {
  return edition.title;
}

export function priceLabel(cents: number): string {
  return `R${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/**
 * Whether an edition has passed its free date and can be read without a
 * membership, and whether its public text page therefore exists.
 *
 * One definition, used by the edition page, the text route and the sitemap.
 * All three have to agree: if the sitemap says the text page exists and the
 * route disagrees, every month adds a 404 to the index, and if the edition
 * page disagrees it renders a link to nothing.
 *
 * Lives here rather than inline in a component because it reads the clock,
 * which makes a component impure and is flagged as such by lint. That rule
 * is right: a component that renders differently at different times of day
 * should say so at the boundary rather than in the middle of its markup.
 */
export function isFreeToRead(edition: MoxieEdition, now: number = Date.now()): boolean {
  if (edition.status !== "published" || !edition.free_from) return false;
  return new Date(edition.free_from).getTime() <= now;
}
