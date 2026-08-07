import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LinkButton } from "@/components/ui/Button";
import { WindowPill } from "@/components/admin/whatsapp/WindowPill";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The WhatsApp inbox (scripts/handoff-whatsapp-inbox.md section 5): one
// screen, conversations newest first, unread visible. Structure: filter
// tabs on top (Open is the working list and the default; Needs you is the
// subset waiting on Dewald; Finished is outcome-marked threads riding out
// the retention clock), a search box that appears only once the list can
// outgrow a phone screen, then the conversation rows. Everything else
// lives on the thread screen a row opens.
const VIEWS = [
  { id: "open", label: "Open" },
  { id: "needs", label: "Needs you" },
  { id: "finished", label: "Finished" },
] as const;

const DOOR_LABEL: Record<string, string> = {
  job: "Job request",
  member: "Member",
  join: "Wants to join",
};

export default async function WhatsAppInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const params = await searchParams;
  const view = VIEWS.some((v) => v.id === params.view) ? params.view! : "open";
  const q = (params.q ?? "").trim();

  const admin = createAdminClient();

  let query = admin
    .from("wa_conversations")
    .select(
      "id, wa_id, profile_name, door, labels, outcome, needs_human, unread_count, last_inbound_at, last_outbound_at, created_at"
    )
    .order("last_inbound_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (view === "open") query = query.is("outcome", null);
  if (view === "needs") query = query.is("outcome", null).eq("needs_human", true);
  if (view === "finished") query = query.not("outcome", "is", null);
  if (q) query = query.or(`profile_name.ilike.%${q}%,wa_id.ilike.%${q}%`);

  const { data: conversations } = await query;
  const list = conversations ?? [];

  // Last message previews in one query rather than one per row.
  const { data: lastMessages } = list.length
    ? await admin
        .from("wa_messages")
        .select("conversation_id, direction, body, status, created_at")
        .in(
          "conversation_id",
          list.map((c) => c.id)
        )
        .order("created_at", { ascending: false })
    : { data: [] };

  const previewByConversation = new Map<string, { body: string | null; direction: string; failed: boolean }>();
  const failedByConversation = new Set<string>();
  for (const m of lastMessages ?? []) {
    if (!previewByConversation.has(m.conversation_id)) {
      previewByConversation.set(m.conversation_id, {
        body: m.body,
        direction: m.direction,
        failed: m.status === "failed",
      });
    }
    if (m.status === "failed") failedByConversation.add(m.conversation_id);
  }

  const [{ count: unreadTotal }, { count: needsCount }] = await Promise.all([
    admin.from("wa_conversations").select("id", { count: "exact", head: true }).gt("unread_count", 0),
    admin
      .from("wa_conversations")
      .select("id", { count: "exact", head: true })
      .is("outcome", null)
      .eq("needs_human", true),
  ]);

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={unreadTotal ? "brand" : "neutral"}>{unreadTotal ?? 0} unread</StatusPill>
            <LinkButton href="/admin/whatsapp/answers" variant="secondary" size="sm" className="bg-white">
              Saved answers
            </LinkButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={v.id === "open" ? "/admin/whatsapp" : `/admin/whatsapp?view=${v.id}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === v.id
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-brand"
              }`}
            >
              {v.label}
              {v.id === "needs" && needsCount ? ` (${needsCount})` : ""}
            </Link>
          ))}
        </div>

        {(list.length >= 20 || q) && (
          <form action="/admin/whatsapp" className="flex gap-2">
            {view !== "open" && <input type="hidden" name="view" value={view} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name or number"
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand"
            />
          </form>
        )}

        <div className="flex flex-col gap-3">
          {list.map((c) => {
            const preview = previewByConversation.get(c.id);
            return (
              <Link key={c.id} href={`/admin/whatsapp/${c.id}`}>
                <Card
                  variant={c.unread_count > 0 || c.needs_human ? "elevated" : "default"}
                  className="flex flex-col gap-2 transition hover:border-brand"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
                      {c.profile_name || `+${c.wa_id}`}
                      {c.unread_count > 0 && <StatusPill tone="brand">{c.unread_count} new</StatusPill>}
                      {c.needs_human && !c.outcome && <StatusPill tone="warning">Needs you</StatusPill>}
                      {failedByConversation.has(c.id) && <StatusPill tone="danger">Send failed</StatusPill>}
                    </p>
                    <WindowPill lastInboundAt={c.last_inbound_at} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {c.door && <StatusPill tone="neutral">{DOOR_LABEL[c.door] ?? c.door}</StatusPill>}
                    {c.outcome && <StatusPill tone="success">{c.outcome}</StatusPill>}
                    {c.labels
                      .filter((l: string) => !["job request", "member support", "joining"].includes(l))
                      .slice(0, 2)
                      .map((l: string) => (
                        <StatusPill key={l} tone="neutral">
                          {l}
                        </StatusPill>
                      ))}
                    {c.last_inbound_at && (
                      <span className="ml-auto">{new Date(c.last_inbound_at).toLocaleString()}</span>
                    )}
                  </div>
                  {preview?.body && (
                    <p className="truncate text-sm text-gray-600">
                      {preview.direction === "out" ? "You: " : ""}
                      {preview.body}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
          {list.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400">
                {view === "needs"
                  ? "Nothing is waiting on you."
                  : view === "finished"
                    ? "No finished conversations. Mark an outcome on a thread and it moves here until cleanup."
                    : q
                      ? "Nothing matches that search."
                      : "No conversations yet. When someone messages the WhatsApp number, their conversation appears here."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
