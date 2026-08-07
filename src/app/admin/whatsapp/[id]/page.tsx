import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { WindowPill } from "@/components/admin/whatsapp/WindowPill";
import { ThreadView, type ThreadMessage, type ThreadSavedAnswer } from "@/components/admin/whatsapp/ThreadView";
import { ThreadDetails } from "@/components/admin/whatsapp/ThreadDetails";
import { getBotCopy } from "@/lib/wa-inbox/copy";
import { isWindowOpen, hoursSince, NUDGE_OFFER_HOURS } from "@/lib/wa-inbox/window";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// One conversation (handoff section 5): the full thread, which door they
// came through, the structured job fields, labels, the window countdown,
// saved answers one tap away, and a reply box. Top to bottom: header with
// who and the countdown, the facts card, then the thread with the composer
// at the bottom where a thumb reaches.
const DOOR_LABEL: Record<string, string> = {
  job: "Job request",
  member: "Member",
  join: "Wants to join",
};

export default async function WhatsAppThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const { id } = await params;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("wa_conversations")
    .select(
      "id, wa_id, profile_name, door, flow_step, trade, suburb, urgency, labels, outcome, outcome_at, needs_human, last_inbound_at, nudge_sent_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const [{ data: messages }, { data: savedAnswers }, { data: settings }, copy] = await Promise.all([
    admin
      .from("wa_messages")
      .select("id, direction, kind, body, status, error_detail, sent_by, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    admin
      .from("wa_saved_answers")
      .select("id, group_slug, button_label, body")
      .eq("active", true)
      .order("group_slug")
      .order("sort_order"),
    admin.from("wa_settings").select("retention_hours").single(),
    getBotCopy(admin),
  ]);

  const windowOpen = isWindowOpen(conversation.last_inbound_at);

  // The hour-20 nudge is OFFERED here and nowhere else, and only for a
  // thread that has gone silent: window still open, nothing inbound for 20
  // hours, not already nudged this window, not finished (handoff section
  // 6). Sending is Dewald's tap; nothing sends by itself.
  const nudgeEligible =
    windowOpen &&
    !!conversation.last_inbound_at &&
    hoursSince(conversation.last_inbound_at) >= NUDGE_OFFER_HOURS &&
    !conversation.nudge_sent_at &&
    !conversation.outcome;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/whatsapp" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← WhatsApp
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {conversation.profile_name || `+${conversation.wa_id}`}
              </h1>
              {conversation.profile_name && <p className="text-xs text-gray-500">+{conversation.wa_id}</p>}
            </div>
            {conversation.door && <StatusPill tone="neutral">{DOOR_LABEL[conversation.door]}</StatusPill>}
          </div>
          <WindowPill lastInboundAt={conversation.last_inbound_at} />
        </div>

        <ThreadDetails
          conversationId={conversation.id}
          door={conversation.door}
          trade={conversation.trade}
          suburb={conversation.suburb}
          urgency={conversation.urgency}
          labels={conversation.labels}
          outcome={conversation.outcome}
          outcomeAt={conversation.outcome_at}
          retentionHours={settings?.retention_hours ?? 72}
        />

        <ThreadView
          conversationId={conversation.id}
          messages={(messages ?? []) as ThreadMessage[]}
          savedAnswers={(savedAnswers ?? []) as ThreadSavedAnswer[]}
          windowOpen={windowOpen}
          nudgeEligible={nudgeEligible}
          nudgeText={copy["nudge_20h"] ?? null}
        />
      </div>
    </main>
  );
}
