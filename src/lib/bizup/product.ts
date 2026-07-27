import { cookies } from "next/headers";

// Which product a member is currently in. DigitalFlyer Growth and KatisoBiz
// share one login, one Supabase project and one Next.js app, but they are
// two products with two landing pages and (soon) two domains, so a request
// has to be able to answer "which one am I?".
//
// Same shape as ACTIVE_ROLE_COOKIE in lib/agents/dashboard-role.ts, which
// already solves the sibling problem one level down (one login, two roles
// inside Growth). This is the outer layer again: which product, then which
// role, then which account.
export type Product = "growth" | "bizup";

export const ACTIVE_PRODUCT_COOKIE = "active_product";

export function isProduct(value: unknown): value is Product {
  return value === "growth" || value === "bizup";
}

/**
 * Resolves which product a request belongs to.
 *
 * Host first, path second, and both are supported on purpose. KatisoBiz's own
 * domain (katisobiz.co.za) is not wired yet, so today every KatisoBiz
 * page is reached at /bizup/... on the Growth domain. Once DNS is live the
 * host check starts matching and nothing else has to change -- which is
 * the reason this lives in one function rather than being re-derived at
 * each call site.
 */
export function productFromRequest(host: string | null, pathname: string | null): Product {
  if (host && host.split(":")[0].toLowerCase().startsWith("bizup.")) return "bizup";
  if (pathname && (pathname === "/bizup" || pathname.startsWith("/bizup/"))) return "bizup";
  return "growth";
}

/**
 * The product this login last actually used. Only consulted when a member
 * owns both and the entry point does not say which one they meant, so it
 * is a tie-breaker rather than the routing rule.
 */
export async function getActiveProductPreference(): Promise<Product | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_PRODUCT_COOKIE)?.value;
  return isProduct(value) ? value : null;
}

/**
 * Remembers the product a member landed in. Callable only from a Server
 * Action or Route Handler, matching how ACTIVE_ACCOUNT_COOKIE is written.
 *
 * Never trusted on its own for anything but choosing between two dashboards
 * the member already owns -- it is user-writable browser state, so it must
 * never be allowed to grant access to a product. resolveLandingPath checks
 * real ownership first and only then looks here.
 */
export async function setActiveProductPreference(product: Product): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PRODUCT_COOKIE, product, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Where each product's signed-in member belongs. */
export const PRODUCT_HOME: Record<Product, string> = {
  growth: "/dashboard",
  bizup: "/bizup",
};

/** Where each product sends someone who is not signed in. */
export const PRODUCT_LOGIN: Record<Product, string> = {
  growth: "/login",
  bizup: "/bizup/login",
};

/**
 * The login path to send a signed-out visitor to.
 *
 * On KatisoBiz's own hostname the /bizup prefix is redundant, and emitting it
 * meant every redirect bounced through katisobiz.co.za/bizup/login
 * before the proxy corrected it. The chain ended in the right place but the
 * member saw the wrong URL on the way, which Dewald quite reasonably read
 * as a bug. Emitting the right path first removes the hop entirely.
 */
export async function bizupLoginPath(): Promise<string> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  return host.split(":")[0].toLowerCase().startsWith("bizup.") ? "/login" : "/bizup/login";
}
