import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import {
  SupportInquiryCard,
  type SupportInquiry,
  type SupportReply,
} from "@/components/admin/SupportInquiryCard";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Open is the working list and the default. Archived is where answered
// enquiries go and is only looked at on purpose, so it is a tab rather
// than a section further down the same page.
const VIEWS = [
  { id: "open", label: "Open" },
  { id: "archived", label: "Archived" },
] as const;

// Public Beta Polish Sprint Sec 5: homepage "Get in Touch" submissions land
// here rather than any business owner's leads list — a homepage enquiry is
// about DigitalFlyer itself, not routed to a specific client.
//
// It shipped read-only, with nothing an admin could actually do to a
// message beyond ticking it read. Replying, archiving and deleting now
// happen here, so an enquiry can be finished rather than only noticed.
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const params = await searchParams;
  const view = VIEWS.some((v) => v.id === params.view) ? params.view! : "open";

  const admin = createAdminClient();
  const inquiriesQuery = admin
    .from("homepage_inquiries")
    .select("id, name, email, phone, message, read, archived_at, replied_at, created_at")
    .order("created_at", { ascending: false });

  const { data: inquiries } = await (view === "archived"
    ? inquiriesQuery.not("archived_at", "is", null)
    : inquiriesQuery.is("archived_at", null));

  const list = (inquiries ?? []) as SupportInquiry[];

  // The badge counts the whole inbox, not the current tab, so switching to
  // Archived never makes unread work look like it disappeared. Archiving
  // marks an enquiry read, so nothing archived is counted here anyway.
  const { count: unreadCount } = await admin
    .from("homepage_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  const { count: archivedCount } = await admin
    .from("homepage_inquiries")
    .select("id", { count: "exact", head: true })
    .not("archived_at", "is", null);

  // One query for every reply on the page rather than one per card.
  const { data: replyRows } = list.length
    ? await admin
        .from("homepage_inquiry_replies")
        .select("id, inquiry_id, admin_email, body, created_at")
        .in(
          "inquiry_id",
          list.map((i) => i.id)
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const repliesByInquiry = new Map<string, SupportReply[]>();
  for (const row of (replyRows ?? []) as (SupportReply & { inquiry_id: string })[]) {
    const existing = repliesByInquiry.get(row.inquiry_id) ?? [];
    existing.push(row);
    repliesByInquiry.set(row.inquiry_id, existing);
  }

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Support</h1>
          </div>
          <StatusPill tone={unreadCount ? "brand" : "neutral"}>{unreadCount ?? 0} unread</StatusPill>
        </div>
        <p className="text-sm text-gray-500">
          Enquiries submitted through the &ldquo;Get in Touch&rdquo; block on the main pricing page, about
          DigitalFlyer itself, not any specific client. Reply from here and the reply is kept on the enquiry.
        </p>

        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={v.id === "open" ? "/admin/support" : `/admin/support?view=${v.id}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === v.id
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-brand"
              }`}
            >
              {v.label}
              {v.id === "archived" && archivedCount ? ` (${archivedCount})` : ""}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {list.map((inquiry) => (
            <SupportInquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              replies={repliesByInquiry.get(inquiry.id) ?? []}
            />
          ))}
          {list.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400">
                {view === "archived" ? "Nothing archived yet." : "No open enquiries."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
