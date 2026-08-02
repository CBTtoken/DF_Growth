import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderLookupForm } from "@/components/shop/OrderLookupForm";
import { getShopOwner } from "@/lib/shop/queries";

export const revalidate = 60;
export const dynamic = "force-static";

// Nothing to index. It is a lookup form over other people's orders.
export const metadata: Metadata = {
  title: "Find your orders",
  robots: { index: false, follow: false },
};

export default async function OrderLookupPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Find your orders</h1>
      <p className="mb-6 mt-2 text-sm text-gray-600">
        Enter the email address you used and we will send you a link to each order and where it is
        up to.
      </p>
      <OrderLookupForm
        clientSlug={clientSlug}
        businessName={owner.business_name}
        primaryColor={owner.brand_primary_color ?? "#1081b8"}
      />
    </div>
  );
}
