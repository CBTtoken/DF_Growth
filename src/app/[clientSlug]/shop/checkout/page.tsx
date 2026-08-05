import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { getShopOwner } from "@/lib/shop/queries";

export const revalidate = 60;
export const dynamic = "force-static";

// Nothing here should ever be indexed or shared. It is a form over somebody
// else's basket and it is different for every visitor.
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function ShopCheckoutPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return notFound();

  const address = owner.delivery.collectionAddress;
  const collectionAddressLine = address?.line1
    ? [address.line1, address.city, address.postalCode].filter(Boolean).join(", ")
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Checkout</h1>
      <CheckoutForm
        clientSlug={clientSlug}
        businessName={owner.business_name}
        primaryColor={owner.brand_primary_color ?? "#1081b8"}
        delivery={owner.delivery}
        // Only whether they can take a card, never the key that lets them.
        hasGateway={owner.hasGateway}
        gatewayProvider={owner.gatewayProvider}
        collectionAddressLine={collectionAddressLine}
      />
    </div>
  );
}
