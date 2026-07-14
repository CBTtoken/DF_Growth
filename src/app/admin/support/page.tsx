import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { markInquiryRead } from "@/app/admin/support/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Public Beta Polish Sprint Sec 5: homepage "Get in Touch" submissions land
// here rather than any business owner's leads list — a homepage enquiry is
// about DigitalFlyer itself, not routed to a specific client.
export default async function AdminSupportPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  const { data: inquiries } = await admin
    .from("homepage_inquiries")
    .select("id, name, email, phone, message, read, created_at")
    .order("created_at", { ascending: false });

  const unreadCount = (inquiries ?? []).filter((i) => !i.read).length;

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
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {unreadCount} unread
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Enquiries submitted through the &ldquo;Get in Touch&rdquo; block on the main pricing page — about
          DigitalFlyer itself, not any specific client.
        </p>

        <div className="flex flex-col gap-3">
          {(inquiries ?? []).map((inquiry) => (
            <div
              key={inquiry.id}
              className={`flex flex-col gap-2 rounded-2xl border p-6 shadow-sm ${
                inquiry.read ? "border-gray-100 bg-white" : "border-brand/20 bg-brand/5"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{inquiry.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
                    <a href={`mailto:${inquiry.email}`} className="text-brand underline-offset-2 hover:underline">
                      {inquiry.email}
                    </a>
                    {inquiry.phone && (
                      <>
                        <span aria-hidden>·</span>
                        <a
                          href={`tel:${inquiry.phone.replace(/\s+/g, "")}`}
                          className="text-brand underline-offset-2 hover:underline"
                        >
                          {inquiry.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(inquiry.created_at).toLocaleString()}</span>
                  <form action={markInquiryRead.bind(null, inquiry.id, !inquiry.read)}>
                    <button
                      type="submit"
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                    >
                      {inquiry.read ? "Mark unread" : "Mark read"}
                    </button>
                  </form>
                </div>
              </div>
              {inquiry.message && (
                <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{inquiry.message}</p>
              )}
            </div>
          ))}
          {(!inquiries || inquiries.length === 0) && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              No enquiries yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
