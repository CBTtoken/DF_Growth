import { notFound } from "next/navigation";
import { CartProvider } from "@/components/shop/CartProvider";
import { CartBar, ShopHeader } from "@/components/shop/ShopChrome";
import { ClientPageNavBar } from "@/components/landing/ClientPageNavBar";
import { getShopOwner } from "@/lib/shop/queries";

// The shell every shop page shares: the member's own header, the basket,
// and the basket bar at the bottom of the thumb.
//
// The owner lookup is wrapped in React's cache() (lib/shop/queries.ts), so
// this and the page below it are one database round trip between them
// rather than two. That matters here more than it does on most layouts:
// this route is the one a stranger opens from a WhatsApp link on mobile
// data, and every avoidable round trip is time they spend looking at
// nothing.
export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const owner = await getShopOwner(clientSlug);

  // Covers every reason there is nothing to serve here: no such member,
  // not active, or Shop switched off. A visitor is owed one answer, not a
  // taxonomy of why.
  if (!owner) return notFound();

  const primaryColor = owner.brand_primary_color ?? "#1081b8";
  const logoUrl = owner.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${owner.logo_path}`
    : null;

  return (
    <CartProvider clientSlug={clientSlug}>
      <ClientPageNavBar />
      <ShopHeader
        clientSlug={clientSlug}
        businessName={owner.business_name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <main className="min-h-[60vh] bg-white">{children}</main>
      <CartBar clientSlug={clientSlug} primaryColor={primaryColor} />
      <ShopFooter businessName={owner.business_name} />
    </CartProvider>
  );
}

function ShopFooter({ businessName }: { businessName: string }) {
  return (
    <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
      © {new Date().getFullYear()} {businessName}
    </footer>
  );
}
