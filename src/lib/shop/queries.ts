// Everything the storefront, the product page and the featured row read.
//
// Kept in one file rather than inline in each route because all three want
// almost the same shape and the three of them drifting apart is how a
// product ends up priced one way on the shop and another way on its own
// page. The three callers differ only in how much they ask for.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliveryModeOf, type ShopDeliverySettings } from "@/lib/shop/delivery";

export const SHOP_IMAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shop-products`;

export function shopImageUrl(path: string): string {
  return `${SHOP_IMAGE_BASE}/${path}`;
}

export type ShopVariant = {
  id: string;
  sku: string;
  descriptor: Record<string, string> | null;
  price_cents: number | null;
  stock_quantity: number;
  is_active: boolean;
};

export type StorefrontProduct = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  base_price_cents: number;
  image_paths: string[];
  is_featured: boolean;
  track_stock: boolean;
  price_pending: boolean;
  position: number;
  created_at: string;
  variants: ShopVariant[];
};

export type ShopOwner = {
  id: string;
  slug: string;
  business_name: string;
  contact_email: string | null;
  call_phone: string | null;
  whatsapp_phone: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  logo_path: string | null;
  template: string | null;
  city: string | null;
  shop_enabled: boolean;
  delivery: ShopDeliverySettings;
  /** Whether this member can take payment online. Never the key itself. */
  hasGateway: boolean;
  /** Which gateway the checkout runs on. Bob Pay wins when both connect. */
  gatewayProvider: "bobpay" | "paystack" | null;
};

const PRODUCT_COLUMNS =
  "id, slug, title, description, base_price_cents, image_paths, is_featured, track_stock, price_pending, position, created_at, shop_product_variants(id, sku, descriptor, price_cents, stock_quantity, is_active)";

type RawProduct = Omit<StorefrontProduct, "variants" | "image_paths"> & {
  image_paths: unknown;
  shop_product_variants: ShopVariant[];
};

/**
 * Turns a Postgrest row into the shape the components expect.
 *
 * Exported because the landing page fetches its products inside one big
 * embedded query of its own rather than calling the functions below, and
 * both routes must agree about what a product is. Two shapers would be two
 * chances for a price to render one way on the shop and another on the
 * landing page.
 */
export function shapeShopProduct(row: unknown): StorefrontProduct {
  const raw = row as RawProduct;
  return {
    ...raw,
    image_paths: Array.isArray(raw.image_paths) ? (raw.image_paths as string[]) : [],
    variants: (raw.shop_product_variants ?? []).filter((v) => v.is_active),
  };
}

const shapeProduct = shapeShopProduct;

/**
 * The member behind a shop, or null.
 *
 * Null covers every reason a shop should not be served: no such slug, the
 * client is not active, or they have Shop switched off. The caller turns
 * all of those into the same 404, because a visitor is owed one answer and
 * not a taxonomy of why.
 */
export const getShopOwner = cache(async function getShopOwner(
  clientSlug: string
): Promise<ShopOwner | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, brand_secondary_color, logo_path, template, city, shop_enabled, shop_delivery_mode, shop_flat_delivery_cents, shop_free_delivery_over_cents, shop_collection_address, growth_client_secrets(paystack_secret_encrypted, bobpay_api_key_encrypted, bobpay_account_code), landing_pages(page_type)"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .eq("shop_enabled", true)
    .maybeSingle();

  if (!data) return null;

  // A custom page brings its own checkout and this one must stay out of its
  // way. Standing 365 is the live example: it sells a book with a
  // personalised edition, and its own order form collects the name to print
  // on the cover and the gift message to go inside. The generic storefront
  // knows nothing about either, so serving one for that product would take
  // a real buyer through a flow that silently drops what they came to buy.
  //
  // Its rows genuinely live in shop_products and shop_orders (they were
  // moved there deliberately, see the orders_unify migration), so the only
  // thing that separates the two is this check.
  const landingPages = (data.landing_pages ?? []) as unknown as { page_type: string }[];
  if (landingPages.some((page) => page.page_type === "custom")) return null;

  // growth_client_secrets.growth_client_id is its own primary key, so
  // Postgrest embeds it as a single object rather than an array. The key
  // itself is deliberately never carried past this boolean: nothing that
  // renders needs it, and a value that reaches a component is a value that
  // can reach a browser.
  const secrets = data.growth_client_secrets as unknown as {
    paystack_secret_encrypted: string | null;
    bobpay_api_key_encrypted: string | null;
    bobpay_account_code: string | null;
  } | null;

  const hasBobPay = Boolean(secrets?.bobpay_api_key_encrypted && secrets?.bobpay_account_code);
  const hasPaystack = Boolean(secrets?.paystack_secret_encrypted);

  return {
    id: data.id,
    slug: data.slug,
    business_name: data.business_name,
    contact_email: data.contact_email,
    call_phone: data.call_phone,
    whatsapp_phone: data.whatsapp_phone,
    brand_primary_color: data.brand_primary_color,
    brand_secondary_color: data.brand_secondary_color,
    logo_path: data.logo_path,
    template: data.template,
    city: data.city,
    shop_enabled: data.shop_enabled,
    delivery: {
      mode: deliveryModeOf(data.shop_delivery_mode),
      flatCents: data.shop_flat_delivery_cents ?? 0,
      freeOverCents: data.shop_free_delivery_over_cents ?? null,
      collectionAddress: (data.shop_collection_address as ShopDeliverySettings["collectionAddress"]) ?? null,
    },
    hasGateway: hasBobPay || hasPaystack,
    gatewayProvider: hasBobPay ? "bobpay" : hasPaystack ? "paystack" : null,
  };
});

/** Every product on sale in one shop, in the member's own order. */
export const getStorefrontProducts = cache(async function getStorefrontProducts(
  growthClientId: string
): Promise<StorefrontProduct[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shop_products")
    .select(PRODUCT_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .eq("status", "active")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as RawProduct[]).map(shapeProduct);
});

/** One product by its slug within one shop, or null. */
export const getProductBySlug = cache(async function getProductBySlug(
  growthClientId: string,
  productSlug: string
): Promise<StorefrontProduct | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shop_products")
    .select(PRODUCT_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .eq("slug", productSlug)
    .eq("status", "active")
    .maybeSingle();

  return data ? shapeProduct(data as unknown as RawProduct) : null;
});

/**
 * The three products that appear on the landing page.
 *
 * Handoff Sec 1.1, and this is the whole of the reasoning: "Do not call
 * these 'most popular'. There is no sales data on day one. The member
 * chooses which products to feature, and if they have not chosen, fall back
 * to most recently added."
 *
 * So the fallback is recency, which claims nothing, rather than sale_count,
 * which on a shop that has sold nothing ranks three products at zero and
 * presents the result to a buyer as evidence other people bought them.
 */
export function featuredProducts(products: StorefrontProduct[], limit = 3): StorefrontProduct[] {
  const chosen = products.filter((p) => p.is_featured);
  if (chosen.length > 0) return chosen.slice(0, limit);
  return [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * What a product costs, given that a variant may override the base price.
 *
 * A null price_cents on a variant means "inherit", which is the schema's own
 * design and not an accident, so it has to be resolved everywhere a price is
 * shown or charged.
 */
export function variantPriceCents(product: StorefrontProduct, variant?: ShopVariant | null): number {
  return variant?.price_cents ?? product.base_price_cents;
}

/** The lowest price a product can be bought at, for a storefront card. */
export function fromPriceCents(product: StorefrontProduct): number {
  if (product.variants.length === 0) return product.base_price_cents;
  return Math.min(...product.variants.map((v) => variantPriceCents(product, v)));
}

/** Whether a product has more than one thing to choose between. */
export function hasChoices(product: StorefrontProduct): boolean {
  return product.variants.filter((v) => Object.keys(v.descriptor ?? {}).length > 0).length > 1;
}

/**
 * Whether this product can be bought right now.
 *
 * A product that does not track stock is always available, which is the
 * default and the common case: the member makes it to order, or counts what
 * is in the box by looking at the box. Saying "out of stock" because a
 * number nobody maintains happens to be zero turns away real money.
 */
export function isSoldOut(product: StorefrontProduct): boolean {
  if (!product.track_stock) return false;
  return product.variants.every((v) => v.stock_quantity <= 0);
}

/**
 * Whether this product can be put in a basket at all.
 *
 * A product waiting for its price is listed, described, indexed and
 * shareable, but not orderable. That is the honest state for a member who
 * has sent us their range before their price list: the page does its job of
 * telling somebody the product exists, and nobody can buy it for the zero
 * that is standing in for a real figure.
 */
export function isBuyable(product: StorefrontProduct): boolean {
  return !product.price_pending && !isSoldOut(product);
}

/** What the price line says when there is not a price yet. */
export const PRICE_ON_REQUEST = "Price on request";
