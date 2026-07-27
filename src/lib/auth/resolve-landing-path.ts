import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProductPreference, type Product } from "@/lib/bizup/product";

export type LandingPath = "/dashboard" | "/onboard" | "/bizup" | "/bizup/start";

// Public Beta Polish Sprint Sec 1: the server-side counterpart to
// auth/callback/page.tsx's own status lookup — that one runs client-side
// against the user's own session (RLS-scoped), this one runs from a
// Server Action (the /login flow) where an admin client is already the
// established pattern (see requireGrowthClientId).
//
// Extended for BizUp. One login can now hold a Growth business, an agent
// record, a BizUp account, or any combination, so "where does this person
// belong" is no longer a single status check. The precedence, in order:
//
//   1. What they actually own. Someone who holds only one of the products
//      goes there, whatever page they happened to log in on. This is
//      checked first and from real rows, never from a cookie.
//   2. Where they came from. Only breaks the tie for someone who owns
//      both: logging in on BizUp's own page means they meant BizUp.
//   3. What they used last. Only when they own both and arrived somewhere
//      that does not say which they meant.
//
// Deliberately NOT routed on a stored "signed up via BizUp" flag. Origin
// is worth recording for attribution, but a member who starts on BizUp and
// later buys Growth would be sent back to BizUp forever by it.
export interface LandingInputs {
  /** Does this login hold a Growth business membership? */
  hasGrowth: boolean;
  /** Their most recent growth_client's status, if any. */
  growthStatus?: string | null;
  hasBizUp: boolean;
  /** An approved agent record. */
  hasAgent: boolean;
  /** The product whose page they signed in on, if it said. */
  enteredFrom?: Product | null;
  /** The product they used last, from the preference cookie. */
  lastUsed?: Product | null;
}

/**
 * The decision itself, with no database and no cookies in it.
 *
 * Split out from the lookup below so the precedence can be verified
 * exhaustively as a table rather than only by getting a real session into
 * each of eight ownership combinations.
 */
export function chooseLandingPath(input: LandingInputs): LandingPath {
  // An active business goes to its dashboard, an unfinished one back into
  // the wizard. Unchanged from before BizUp existed.
  const growthPath: LandingPath = input.growthStatus === "active" ? "/dashboard" : "/onboard";

  if (input.hasGrowth && input.hasBizUp) {
    const chosen = input.enteredFrom ?? input.lastUsed ?? "growth";
    return chosen === "bizup" ? "/bizup" : growthPath;
  }

  if (input.hasBizUp) return "/bizup";
  if (input.hasGrowth) return growthPath;

  // An approved agent with no business membership at all (Natasha,
  // HelpLift). Previously fell through to "/onboard", which renders "No
  // account found" and dead-ends a perfectly good login — the same gap
  // that was already fixed inside the dashboard itself but never here, so
  // it only bit agents who logged in from the login page rather than
  // arriving on a dashboard link. /dashboard forwards them to
  // /dashboard/agent.
  if (input.hasAgent) return "/dashboard";

  // Nothing yet. Someone arriving on BizUp's own login page with no
  // account is almost certainly there to make one, so send them into
  // BizUp's setup rather than Growth's onboarding wizard.
  if (input.enteredFrom === "bizup") return "/bizup/start";

  return "/onboard";
}

export async function resolveLandingPath(
  userId: string,
  enteredFrom?: Product | null,
): Promise<LandingPath> {
  const admin = createAdminClient();

  // Three independent lookups, so they run together rather than in series.
  // This sits directly in the login path, where latency is felt.
  const [membershipRes, bizupRes, agentRes] = await Promise.all([
    admin
      .from("growth_members")
      .select("growth_clients(status)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("bizup_accounts").select("id").eq("owner_user_id", userId).limit(1),
    admin.from("agents").select("id").eq("user_id", userId).eq("status", "approved").limit(1),
  ]);

  const hasGrowth = !!membershipRes.data;
  const hasBizUp = (bizupRes.data ?? []).length > 0;

  return chooseLandingPath({
    hasGrowth,
    growthStatus: (membershipRes.data?.growth_clients as unknown as { status: string } | null)?.status,
    hasBizUp,
    hasAgent: (agentRes.data ?? []).length > 0,
    enteredFrom,
    // Only read when it can actually matter. cookies() is request-scoped,
    // so keeping it behind this check also keeps resolveLandingPath usable
    // from a script or a job that has no request context.
    lastUsed: hasGrowth && hasBizUp ? await getActiveProductPreference() : null,
  });
}
