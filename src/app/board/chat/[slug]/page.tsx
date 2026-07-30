import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentVisitor } from "@/lib/board/visitor";
import { listIdentityThreads, readThread } from "@/lib/board/chat";
import { ChatScreen } from "@/components/board/ChatScreen";

// One conversation, full screen, the way a messaging app looks.
//
// Dewald's correction: messaging should not be a form that unfolds inside a
// post. It should be its own screen that opens like WhatsApp, with the
// business at the top, the conversation in the middle and the box at the
// bottom. So the Message button on a post now navigates here instead of
// expanding in place, and this screen is what the Messages icon on the
// phone opens into.
//
// Dynamic, because it reads who this is. That is fine: the pages that must
// stay cached for Google are the posts, and a private conversation is the
// one thing that must never be.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BoardChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: business } = await admin
    .from("growth_clients")
    .select("id, slug, business_name, logo_path, brand_primary_color, chat_enabled, whatsapp_phone")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!business) notFound();

  const visitor = await currentVisitor();

  // An existing conversation with this business, if there is one.
  let messages = [] as Awaited<ReturnType<typeof readThread>>;
  let threadId: string | null = null;

  if (visitor) {
    const threads = await listIdentityThreads(visitor.id);
    const existing = threads.find((t) => t.growthClientId === business.id);
    if (existing) {
      threadId = existing.id;
      messages = await readThread(existing.id, "public");
    }
  }

  const logoUrl = business.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${business.logo_path}`
    : null;

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-neutral-light">
      {/* A messaging app's own bar, not the marketing header. Somebody who
          opened this from the phone icon is in a chat, not on a website. */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-border bg-white px-4 py-3">
        <Link href="/board/messages" aria-label="Back" className="text-neutral-muted hover:text-neutral-ink">
          <ChevronLeft size={20} />
        </Link>
        <div className="size-9 shrink-0 overflow-hidden rounded-full border border-neutral-border bg-white">
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={36} height={36} className="size-full object-cover" />
          ) : (
            <span
              className="flex size-full items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: business.brand_primary_color || "#1081b8" }}
              aria-hidden
            >
              {business.business_name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-neutral-ink">{business.business_name}</p>
          <Link href={`/${business.slug}`} className="text-[11px] text-neutral-muted hover:text-brand-blue">
            See their page
          </Link>
        </div>
      </header>

      <ChatScreen
        growthClientId={business.id}
        businessName={business.business_name}
        threadId={threadId}
        messages={messages}
        knownName={visitor?.displayName ?? null}
        knownEmail={visitor?.email ?? null}
        chatEnabled={business.chat_enabled !== false}
        whatsapp={business.whatsapp_phone}
      />
    </main>
  );
}
