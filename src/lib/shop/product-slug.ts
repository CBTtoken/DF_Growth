import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

/**
 * A free address for a product inside one member's shop.
 *
 * Two rules, and the second one is the one that matters. First, it has to be
 * unique within the shop, so a numeric suffix is added when a member has two
 * products whose titles slugify the same way. Second, it never changes once
 * a product has one.
 *
 * That second rule is why this is only ever called for a new product. A
 * product page URL is the thing the member pastes into a WhatsApp message,
 * and those messages sit in threads for months. Regenerating the slug
 * because somebody fixed a typo in the title would break every one of them
 * silently, and the member would never find out: nobody reports a link they
 * were sent in March quietly 404ing in June.
 */
/**
 * Segments that are real pages under /[clientSlug]/shop.
 *
 * Next.js gives a static segment priority over a dynamic one, so a product
 * slugging to "checkout" would not break the checkout page. It would break
 * the product: its page would be permanently unreachable at its own URL,
 * with no error anywhere, which is the worse of the two failures because
 * nobody notices it.
 */
const RESERVED_PRODUCT_SLUGS = new Set(["checkout", "order"]);

export async function uniqueProductSlug(
  growthClientId: string,
  title: string,
  excludeProductId?: string
): Promise<string> {
  const slugged = slugify(title) || "product";
  const base = RESERVED_PRODUCT_SLUGS.has(slugged) ? `${slugged}-item` : slugged;

  const admin = createAdminClient();
  const { data } = await admin
    .from("shop_products")
    .select("id, slug")
    .eq("growth_client_id", growthClientId)
    .like("slug", `${base}%`);

  const taken = new Set(
    (data ?? []).filter((row) => row.id !== excludeProductId).map((row) => row.slug as string)
  );

  if (!taken.has(base)) return base;

  // Bounded rather than a while(true). A member with two thousand products
  // called the same thing has a different problem, and an unbounded loop
  // against a database is not the place to discover it.
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
