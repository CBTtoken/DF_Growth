import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChatThreadView } from "@/components/board/ChatThreadView";
import { ConversationList } from "@/components/board/ConversationList";
import { listMemberThreads, readThread } from "@/lib/board/chat";
import { replyAsMember, setChatEnabled } from "@/app/dashboard/messages/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const { thread: threadParam } = await searchParams;
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

  const clientId = client.id;
  const admin = createAdminClient();
  const [{ data: growthClient }, threads] = await Promise.all([
    admin.from("growth_clients").select("chat_enabled").eq("id", clientId).single(),
    listMemberThreads(clientId),
  ]);

  const chatEnabled = growthClient?.chat_enabled !== false;
  const active = threadParam ? threads.find((t) => t.id === threadParam) : threads[0];
  const messages = active ? await readThread(active.id, "member") : [];

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <BrandHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-brand"
        >
          <ChevronLeft size={14} /> Dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Messages</h1>
            <p className="mt-1 text-sm text-gray-500">
              People who found you on the board. Your WhatsApp button is still on every post, this just
              gives them another way through.
            </p>
          </div>

          {/* His switch, stated as a consequence rather than a setting. */}
          <form action={setChatEnabled.bind(null, !chatEnabled)}>
            <button
              type="submit"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
            >
              {chatEnabled ? "Turn messages off" : "Turn messages back on"}
            </button>
          </form>
        </div>

        {!chatEnabled && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Messages are off. The button is gone from your posts and nobody new can start a conversation.
            Anything already here still works, because going quiet on somebody halfway through is worse
            than never having offered.
          </p>
        )}

        {threads.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Nobody has messaged you here yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[300px_1fr]">
            <div>
              <ConversationList
                threads={threads}
                side="member"
                hrefFor={(t) => `/dashboard/messages?thread=${t.id}`}
              />
            </div>

            {active && (
              <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-ink">{active.personName}</h2>
                <ChatThreadView
                  messages={messages}
                  side="member"
                  otherName={active.personName}
                  action={replyAsMember.bind(null, active.id)}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
