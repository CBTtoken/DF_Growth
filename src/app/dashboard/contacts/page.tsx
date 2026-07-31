import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactList } from "@/components/board/ContactList";
import { listClients, listProviders } from "@/lib/board/contacts";
import { currentVisitor } from "@/lib/board/visitor";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The member's contacts. Clients on one side, the businesses he uses on the
// other, because a member is also somebody's customer.
export default async function DashboardContactsPage() {
  const client = await requireGrowthClientId();

  if (client.error || !client.id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Please log in</h1>
          <Link href="/login" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Log in
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const visitor = await currentVisitor();
  const [clients, providers] = await Promise.all([
    listClients(client.id),
    visitor ? listProviders(visitor.id) : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <BrandHeader />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-brand"
        >
          <ChevronLeft size={14} /> Dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Contacts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Built from real conversations and real documents. Nothing to type in, and nothing to keep up to date.
        </p>

        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-ink">Clients</h2>
            <span className="text-xs text-gray-400">{clients.length}</span>
          </div>
          <ContactList
            contacts={clients}
            empty="Nobody has messaged you on the board yet, and no KatisoBiz customers are linked to this business."
          />
        </section>

        <section className="mt-8">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-ink">Providers</h2>
            <span className="text-xs text-gray-400">{providers.length}</span>
          </div>
          <p className="mb-2 text-xs text-gray-500">
            Businesses you have messaged yourself, as a person rather than as your business.
          </p>
          <ContactList
            contacts={providers}
            empty="You have not messaged any businesses on the board yet."
          />
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
