import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentThemeId } from "@/lib/agent-page/themes";

// Agent page v3 (docs/agent-page-v3-final.md). One shape, loaded the same
// way for the live page, the admin preview and the OG image route, so a
// draft page previews as exactly what it will publish as.

// v3: the agent's own services render as small pills with no prices shown.
// The stored shape still matches growth_clients.packages, per build spec
// 1.7, so nothing about the data model forked; the page just stopped
// displaying the price.
export type AgentService = {
  name: string;
  price: string;
  description: string;
  type?: "package" | "special" | "discount";
};

export type AgentPage = {
  id: string;
  fullName: string;
  slug: string;
  status: "draft" | "live";
  theme: AgentThemeId;
  town: string | null;
  photoUrl: string | null;
  activeSince: string | null;
  /** v3: the one piece of free text an agent writes. Optional. */
  bio: string | null;
  services: AgentService[];
  whatsappNumber: string | null;
  /** v3: the fallback contact route when there is no WhatsApp number. */
  email: string | null;
  referralCode: string | null;
};

/** v3 section 4: platform proof, the same three pages the pricing page uses. */
export type ProofPage = { businessName: string; slug: string; screenshotUrl: string | null };

/** v3 section 5: the quiet "businesses helped" line, hidden below three. */
export type AgentSocialProof = { businessName: string; slug: string };

const AGENT_PAGE_COLUMNS =
  "id, full_name, page_slug, page_status, page_theme, town, photo_path, active_since, bio, services, whatsapp_number, email, referral_code, approved_at";

type AgentRow = {
  id: string;
  full_name: string;
  page_slug: string | null;
  page_status: string;
  page_theme: string;
  town: string | null;
  photo_path: string | null;
  active_since: string | null;
  bio: string | null;
  services: unknown;
  whatsapp_number: string | null;
  email: string | null;
  referral_code: string | null;
  approved_at: string | null;
};

export function agentPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agent-photos/${photoPath}`;
}

// Stored as jsonb, so nothing here can assume the shape survived whatever
// wrote it. Anything without a usable name is dropped rather than
// rendering an empty pill on a live page.
function parseServices(value: unknown): AgentService[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      name: typeof s.name === "string" ? s.name : "",
      price: typeof s.price === "string" ? s.price : "",
      description: typeof s.description === "string" ? s.description : "",
      type:
        s.type === "special" || s.type === "discount" || s.type === "package"
          ? (s.type as AgentService["type"])
          : "package",
    }))
    .filter((s) => s.name.trim().length > 0);
}

function toAgentPage(row: AgentRow): AgentPage {
  return {
    id: row.id,
    fullName: row.full_name,
    slug: row.page_slug ?? "",
    status: row.page_status === "live" ? "live" : "draft",
    theme: (row.page_theme as AgentThemeId) ?? "slate",
    town: row.town,
    photoUrl: agentPhotoUrl(row.photo_path),
    // v3 credential line, "active since {Month Year}". Falls back to the
    // approval date, the same fact for every agent approved through this
    // system, so the line never renders a gap.
    activeSince: row.active_since ?? row.approved_at,
    bio: row.bio,
    services: parseServices(row.services),
    // Empty string is how a cleared number is stored (agents.whatsapp_number
    // was NOT NULL originally), so normalise it to null here rather than
    // making every reader remember that.
    whatsappNumber: row.whatsapp_number?.trim() ? row.whatsapp_number : null,
    email: row.email?.trim() ? row.email : null,
    referralCode: row.referral_code,
  };
}

// Build spec 1.2: "404 on unknown or inactive agent slugs." The agent must
// also still be approved, so a deactivated agent's page going dark in
// phase 2 lands as a data change, not a code change.
export async function getLiveAgentPage(slug: string): Promise<AgentPage | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agents")
    .select(AGENT_PAGE_COLUMNS)
    .eq("page_slug", slug)
    .eq("page_status", "live")
    .eq("status", "approved")
    .maybeSingle();

  return data ? toAgentPage(data as AgentRow) : null;
}

// v3 slug rules: "A live slug never changes without a permanent redirect.
// These links live in WhatsApp threads forever." Same shape as the
// business-page previous_slugs redirect this codebase already has.
export async function getAgentPageByFormerSlug(slug: string): Promise<{ currentSlug: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agents")
    .select("page_slug")
    .contains("previous_page_slugs", [slug])
    .eq("page_status", "live")
    .eq("status", "approved")
    .maybeSingle();

  return data?.page_slug ? { currentSlug: data.page_slug } : null;
}

// The admin preview path: same shape, no status gate, keyed on the agent
// rather than the slug so a page with no slug set yet can still be seen.
export async function getAgentPageById(agentId: string): Promise<AgentPage | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("agents").select(AGENT_PAGE_COLUMNS).eq("id", agentId).maybeSingle();

  return data ? toAgentPage(data as AgentRow) : null;
}

// v3 section 4: "Three live client pages in device frames. Use Buffelskop,
// HelpLift Network Vaal Triangle and Standing 365, the same three already
// on the pricing page."
//
// Platform proof, not agent proof, so every agent page shows the same
// three. That is deliberate in v3: a brand new agent with nobody signed up
// still needs to show the reader what they will actually get.
export const PROOF_SLUGS = ["buffelskop", "helplift", "standing365"];

export async function getProofPages(): Promise<ProofPage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select("business_name, slug, screenshot_path")
    .in("slug", PROOF_SLUGS)
    .eq("status", "active");

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-screenshots`;
  const bySlug = new Map(
    (data ?? []).map((c) => [
      c.slug as string,
      {
        businessName: c.business_name as string,
        slug: c.slug as string,
        screenshotUrl: c.screenshot_path ? `${base}/${c.screenshot_path}` : null,
      },
    ])
  );

  // Ordered by PROOF_SLUGS rather than by whatever Postgres returned, so
  // the three frames do not reshuffle between renders.
  return PROOF_SLUGS.map((slug) => bySlug.get(slug)).filter((p): p is ProofPage => Boolean(p));
}

// v3 section 5: "If three or more attributed, active and live, a single
// quiet line above the close. Hidden below three. No counts, no invented
// figures." The !inner join on a published landing page is what makes
// "live" true rather than assumed.
export async function getAgentSocialProof(agentId: string): Promise<AgentSocialProof[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select("business_name, slug, landing_pages!inner(published)")
    .eq("referred_by_agent_id", agentId)
    .eq("status", "active")
    .eq("landing_pages.published", true)
    .order("created_at", { ascending: false });

  const businesses = (data ?? []).map((c) => ({
    businessName: c.business_name as string,
    slug: c.slug as string,
  }));

  return businesses.length >= 3 ? businesses : [];
}

// The four questions from build spec 1.6 are gone in v3, replaced by one
// optional bio, so nothing loads them any more.
