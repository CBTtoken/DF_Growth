import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeGrowthClientStatus } from "@/lib/growth-client/admin-status-label";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton, ExternalLinkButton } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, TableHeadRow, Th, Tr, Td } from "@/components/ui/Table";

// Private, allowlist-only — see onboard/page.tsx for the same reasoning.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Minimal, per CLAUDE.md Section 3 ("admin visibility is just a read-only
// view over the same data", no separate admin auth needed) and Sprint 0
// ("no separate admin auth needed"). Gated by email allowlist rather than a
// DB role — there's no `dfsa_admin` role column anywhere in this schema, and
// adding one for a single-operator pilot would be more machinery than the
// problem needs. Built specifically to answer a real UAT question: "what
// happens when a client says they don't know their Meta details?" — before
// this page existed, that flag was captured but genuinely invisible to
// anyone, anywhere.
export default async function AdminPage() {
  const admin_ = await requireAdminEmail();

  // Public Beta Polish Sprint Sec 13.11: this used to render a 200 "Not
  // available" page for a non-admin request — harmless in a browser, but a
  // scripted/unauthenticated request got the same 200 status as a real
  // admin view, telling it the route exists and responds normally. forbidden()
  // returns a real HTTP 403 instead (see admin/forbidden.tsx for the UI).
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  // Combined spec Sec 11: the wide select isn't shown in this table itself
  // (that stays scannable), it's what describeGrowthClientStatus needs to
  // compute the "incomplete, on step X" label per client, and what the new
  // per-client detail page (src/app/admin/clients/[id]/page.tsx) and CSV
  // export both need too — one query shape shared by all three call sites.
  const { data: clients } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, contact_email, plan, status, paystack_reference, meta_pixel_id, meta_setup_requested_help, call_phone, whatsapp_phone, business_description, brand_primary_color, template, packages, created_at, signup_channel"
    )
    .order("created_at", { ascending: false });

  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: landingPages } = await admin.from("landing_pages").select("growth_client_id").in("growth_client_id", clientIds);
  const clientsWithLandingPage = new Set((landingPages ?? []).map((l) => l.growth_client_id));

  const needsMetaHelp = (clients ?? []).filter((c) => c.plan !== "foundation" && !c.meta_pixel_id && c.meta_setup_requested_help);

  // Public Beta Polish Sprint Sec 5: count only, the support page itself
  // owns the actual list — keeps this page's own query lean.
  const { count: unreadSupportCount } = await admin
    .from("homepage_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  // Rate & Review Sprint 2, Sec 3: count only, same reasoning as the
  // support inbox badge above — the queue page itself owns the actual list.
  const { count: flaggedReviewCount } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .not("flagged_by", "is", null);

  // List Your Event Sprint 2, Sec 6: count only, covers both queues on
  // /admin/events (pending-review and flagged) in one badge number.
  const { count: eventsQueueCount } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .or("status.eq.pending_review,flagged_by.not.is.null");

  // Agent Referral Programme Sprint 1, Sec 8: count only, same reasoning
  // as the other queue badges — /admin/agents owns the actual list.
  const { count: pendingAgentsCount } = await admin
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Admin</h1>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/admin/clients/new" lift>
              + New Client
            </LinkButton>
            <LinkButton href="/admin/reactivation" variant="secondary" lift>
              Reactivation Batch
            </LinkButton>
            <LinkButton href="/admin/support" variant="secondary" lift>
              Support
              {!!unreadSupportCount && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadSupportCount}
                </span>
              )}
            </LinkButton>
            <LinkButton href="/admin/reviews" variant="secondary" lift>
              Flagged Reviews
              {!!flaggedReviewCount && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {flaggedReviewCount}
                </span>
              )}
            </LinkButton>
            <LinkButton href="/admin/events" variant="secondary" lift>
              Events Queue
              {!!eventsQueueCount && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {eventsQueueCount}
                </span>
              )}
            </LinkButton>
            <LinkButton href="/admin/agents" variant="secondary" lift>
              Agents
              {!!pendingAgentsCount && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingAgentsCount}
                </span>
              )}
            </LinkButton>
            {/* /api/admin/export is a file-download Route Handler, not a page —
                ExternalLinkButton renders a plain <a>, Link's client-side routing doesn't apply. */}
            <ExternalLinkButton href="/api/admin/export" variant="secondary" lift>
              Export all as CSV ↓
            </ExternalLinkButton>
          </div>
        </div>

        {needsMetaHelp.length > 0 && (
          <Card variant="elevated" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold tracking-tight text-ink">
              Waiting on Meta setup help ({needsMetaHelp.length})
            </h2>
            <p className="text-sm text-gray-600">
              These clients picked &ldquo;I don&apos;t know / need help&rdquo; during onboarding — reach out to connect
              their Pixel and Ad Account for them.
            </p>
            <ul className="flex flex-col gap-2">
              {needsMetaHelp.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm">
                  <span className="font-semibold text-gray-900">{c.business_name}</span>
                  <span className="text-gray-500">{c.contact_email ?? "no email on file"}</span>
                  <StatusPill tone="brand" className="uppercase">
                    {c.plan}
                  </StatusPill>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold tracking-tight text-ink">All growth clients ({clients?.length ?? 0})</h2>
          <Table minWidthClassName="min-w-[640px]">
            <TableHeadRow>
              <Th>Business</Th>
              <Th>Email</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Meta</Th>
              <Th>Channel</Th>
              <Th>Signed up</Th>
              <Th />
            </TableHeadRow>
            <tbody>
              {(clients ?? []).map((c) => {
                const statusLabel = describeGrowthClientStatus({
                  plan: c.plan,
                  status: c.status,
                  paystack_reference: c.paystack_reference,
                  contact_email: c.contact_email,
                  business_description: c.business_description,
                  brand_primary_color: c.brand_primary_color,
                  template: c.template,
                  has_landing_page: clientsWithLandingPage.has(c.id),
                  packages: c.packages,
                  meta_pixel_id: c.meta_pixel_id,
                  meta_setup_requested_help: c.meta_setup_requested_help,
                });
                return (
                  <Tr key={c.id}>
                    <Td className="font-medium text-gray-900">{c.business_name}</Td>
                    <Td className="text-gray-500">{c.contact_email ?? "—"}</Td>
                    <Td className="text-gray-500">{c.plan}</Td>
                    <Td>
                      <StatusPill
                        tone={
                          statusLabel === "Active"
                            ? "success"
                            : statusLabel === "Cancelled" || statusLabel === "Trial lapsed"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {statusLabel}
                      </StatusPill>
                    </Td>
                    <Td className="text-gray-500">
                      {c.plan === "foundation"
                        ? "—"
                        : c.meta_pixel_id
                          ? "Connected"
                          : c.meta_setup_requested_help
                            ? "Needs help"
                            : "Not connected"}
                    </Td>
                    <Td>
                      <StatusPill tone={c.signup_channel === "whatsapp" ? "info" : "neutral"}>
                        {c.signup_channel === "whatsapp" ? "WhatsApp" : "Web"}
                      </StatusPill>
                    </Td>
                    <Td className="text-gray-400">{new Date(c.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <Link href={`/admin/clients/${c.id}`} className="text-xs font-semibold text-brand hover:underline">
                        View
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </main>
  );
}
