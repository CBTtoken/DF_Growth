import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, UsersRound } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactList } from "@/components/board/ContactList";
import { listProviders } from "@/lib/board/contacts";
import { currentVisitor } from "@/lib/board/visitor";

export const metadata: Metadata = {
  title: "Your providers",
  robots: { index: false, follow: false },
  manifest: "/board/messages/manifest.webmanifest",
  icons: { apple: "/api/icons/messages?size=180" },
};
export const dynamic = "force-dynamic";

// The public side of the same idea: the businesses somebody has actually
// dealt with, so finding the plumber again next year is one tap rather than
// a scroll back through a WhatsApp group.
export default async function BoardContactsPage() {
  const visitor = await currentVisitor();

  if (!visitor) {
    return (
      <main className="flex flex-1 flex-col bg-neutral-light">
        <MarketingHeader />
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <UsersRound size={26} className="text-neutral-muted" />
          <h1 className="text-xl font-bold text-neutral-ink">Your providers live here</h1>
          <p className="max-w-md text-sm text-neutral-muted">
            Every business you message from the board is kept here, so you can find them again without scrolling back
            through a group chat.
          </p>
          <Link
            href="/board"
            className="mt-1 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
          >
            Go to the board
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const providers = await listProviders(visitor.id);

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-mid transition-colors hover:text-brand-blue"
        >
          <ChevronLeft size={14} /> The Board
        </Link>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-ink">Your providers</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          Businesses you have dealt with. Built from your own conversations, so there is nothing to fill in.
        </p>

        <div className="mt-5">
          <ContactList
            contacts={providers}
            empty="No businesses yet. Message one from any post on the board and it appears here."
          />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
