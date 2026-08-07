import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  SavedAnswerCard,
  NewAnswerForm,
  BotCopyRow,
  SettingsForm,
  GROUP_OPTIONS,
  type SavedAnswer,
  type BotCopyRowData,
} from "@/components/admin/whatsapp/AnswerLibrary";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The saved answer library (handoff section 4) plus the two things that
// belong beside it: every word the system can send on its own, and the
// retention settings. Structure: saved answers first because that is the
// everyday task, system messages second (mostly touched once, at
// approval), settings last behind the rare-thing rule.
//
// The system copy list is ordered to read as the conversation actually
// unfolds, not alphabetically.
const COPY_ORDER = [
  "welcome_doors",
  "door_button_job",
  "door_button_member",
  "door_button_join",
  "door1_ask_trade",
  "door1_ask_suburb",
  "door1_ask_urgency",
  "urgency_button_today",
  "urgency_button_week",
  "urgency_button_norush",
  "door1_handoff",
  "door2_menu_intro",
  "door2_menu_button",
  "door2_other_row",
  "door2_handoff",
  "door3_question",
  "door3_button_found",
  "door3_button_invoice",
  "door3_reply_found",
  "door3_reply_invoice",
  "door3_handoff",
  "nudge_20h",
];

export default async function WhatsAppAnswersPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  const [{ data: answers }, { data: copyRows }, { data: settings }] = await Promise.all([
    admin
      .from("wa_saved_answers")
      .select("id, group_slug, button_label, body, active")
      .order("sort_order"),
    admin.from("wa_bot_copy").select("slug, label, body, approved"),
    admin.from("wa_settings").select("retention_hours, auto_resolve_days").single(),
  ]);

  const answerList = (answers ?? []) as SavedAnswer[];
  const copyList = (copyRows ?? []) as BotCopyRowData[];
  const orderedCopy = COPY_ORDER.map((slug) => copyList.find((r) => r.slug === slug)).filter(
    (r): r is BotCopyRowData => !!r
  );
  const unapprovedCount = copyList.filter((r) => !r.approved).length;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex items-center gap-3">
          <Link href="/admin/whatsapp" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            ← WhatsApp
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Saved answers</h1>
        </div>

        <section className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">
            Fixed replies you wrote once and send with one tap. The member support group is also offered as tap
            buttons when a member chooses door 2.
          </p>
          {GROUP_OPTIONS.map((group) => {
            const groupAnswers = answerList.filter((a) => a.group_slug === group.id);
            return (
              <div key={group.id} className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-gray-700">{group.label}</h2>
                {groupAnswers.length === 0 && (
                  <p className="text-xs text-gray-400">Nothing here yet. Add one below.</p>
                )}
                {groupAnswers.map((answer, i) => (
                  <SavedAnswerCard
                    key={answer.id}
                    answer={answer}
                    isFirst={i === 0}
                    isLast={i === groupAnswers.length - 1}
                  />
                ))}
              </div>
            );
          })}
          <NewAnswerForm />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">What the system says on its own</h2>
            {unapprovedCount > 0 ? (
              <StatusPill tone="warning">{unapprovedCount} still draft</StatusPill>
            ) : (
              <StatusPill tone="success">All approved</StatusPill>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Every automatic message, in the order a person would meet them. These are drafts until you tick
            Approved: read each one, change what you want, and approve it before the number goes live. Nothing is
            ever generated, the system only sends what is written here.
          </p>
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              Pricing, tax and anything SARS related is only ever answered from these fixed texts and your saved
              answers. If a question like that is not covered, the system stays quiet and hands the thread to you.
            </p>
          </Card>
          {orderedCopy.map((row) => (
            <BotCopyRow key={row.slug} row={row} />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">Cleanup settings</h2>
          <p className="text-sm text-gray-500">
            Conversations hold people&rsquo;s names, numbers and messages, so finished ones delete themselves
            automatically. What survives is only the job facts: trade, suburb, date and outcome, with nothing that
            points at a person. Every automatic deletion is logged.
          </p>
          <SettingsForm
            retentionHours={settings?.retention_hours ?? 72}
            autoResolveDays={settings?.auto_resolve_days ?? 30}
          />
        </section>
      </div>
    </main>
  );
}
