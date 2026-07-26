import { createAdminClient } from "@/lib/supabase/admin";

// Agent Programme Phase 1. One shape, loaded the same way for the live
// page, the admin preview and the OG image route, so a draft page previews
// as exactly what it will publish as.

// Sec 1.7: "Reuse the existing member data model. Three services and
// promotions, same shapes." Identical to growth_clients.packages, right
// down to the optional `type` that decides whether a block is labelled a
// package, a special or a discount.
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
  accentColor: string;
  town: string | null;
  photoUrl: string | null;
  activeSince: string | null;
  heroPromise: string | null;
  storyText: string | null;
  offerText: string | null;
  services: AgentService[];
  whatsappNumber: string | null;
  referralCode: string | null;
};

export type AgentSocialProof = {
  businessName: string;
  slug: string;
  city: string | null;
  industry: string | null;
};

const AGENT_PAGE_COLUMNS =
  "id, full_name, page_slug, page_status, accent_color, town, photo_path, active_since, hero_promise, story_text, offer_text, services, whatsapp_number, referral_code, approved_at";

type AgentRow = {
  id: string;
  full_name: string;
  page_slug: string | null;
  page_status: string;
  accent_color: string;
  town: string | null;
  photo_path: string | null;
  active_since: string | null;
  hero_promise: string | null;
  story_text: string | null;
  offer_text: string | null;
  services: unknown;
  whatsapp_number: string | null;
  referral_code: string | null;
  approved_at: string | null;
};

export function agentPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agent-photos/${photoPath}`;
}

// Stored as jsonb, so nothing here can assume the shape survived whatever
// wrote it. Anything without a usable name is dropped rather than
// rendering an empty card on a live page.
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
    accentColor: row.accent_color,
    town: row.town,
    photoUrl: agentPhotoUrl(row.photo_path),
    // Sec 1.3's credential strip wants "active since {month year}". Falls
    // back to the approval date, which is the same fact for every agent
    // approved through this system, so the strip never renders a gap.
    activeSince: row.active_since ?? row.approved_at,
    heroPromise: row.hero_promise,
    storyText: row.story_text,
    offerText: row.offer_text,
    services: parseServices(row.services),
    whatsappNumber: row.whatsapp_number,
    referralCode: row.referral_code,
  };
}

// Sec 1.2: "404 on unknown or inactive agent slugs." The agent must also
// still be approved — a rejected or deactivated agent's page going dark is
// the whole point of the phase 2 dormancy ladder, and wiring the status
// check in now means that lands as a data change, not a code change.
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

// The admin preview path: same shape, no status gate, keyed on the agent
// rather than the slug so a page with no slug set yet can still be seen.
export async function getAgentPageById(agentId: string): Promise<AgentPage | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("agents").select(AGENT_PAGE_COLUMNS).eq("id", agentId).maybeSingle();

  return data ? toAgentPage(data as AgentRow) : null;
}

// Sec 1.6's four answers, loaded separately from the page itself: they are
// working notes behind the copy, never rendered on the public page, so
// they have no business in the AgentPage shape the page component reads.
export async function getAgentCopyIntake(
  agentId: string
): Promise<{ before: string; why: string; who: string; area: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agents")
    .select("intake_before, intake_why, intake_who, intake_area")
    .eq("id", agentId)
    .maybeSingle();

  return {
    before: data?.intake_before ?? "",
    why: data?.intake_why ?? "",
    who: data?.intake_who ?? "",
    area: data?.intake_area ?? "",
  };
}

// Sec 1.3: "Social proof section listing businesses attributed to this
// agent that are active with a live page. If fewer than three, hide the
// entire section. No counts, no invented figures, same honesty bar as the
// marketplace." The !inner join on a published landing page is what makes
// "with a live page" true rather than assumed — an attributed business
// still mid-onboarding has no page to link to and must not be counted.
export async function getAgentSocialProof(agentId: string): Promise<AgentSocialProof[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select("business_name, slug, city, industry, landing_pages!inner(published)")
    .eq("referred_by_agent_id", agentId)
    .eq("status", "active")
    .eq("landing_pages.published", true)
    .order("created_at", { ascending: false });

  const businesses = (data ?? []).map((c) => ({
    businessName: c.business_name as string,
    slug: c.slug as string,
    city: (c.city as string | null) ?? null,
    industry: (c.industry as string | null) ?? null,
  }));

  return businesses.length >= 3 ? businesses : [];
}
