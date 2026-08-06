import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyPartnerId } from "@/lib/auth/require-growth-client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { AddBusinessForm } from "@/components/dashboard/AddBusinessForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Partner-only entry point (BidWeb's Samantha, for example) — a normal
// member never sees the link that leads here, and this redirects away if
// someone lands here without a partner-linked login anyway.
export default async function AddBusinessPage() {
  const partnerId = await getMyPartnerId();
  if (!partnerId) redirect("/dashboard");

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <BrandHeader />
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Add another business</h1>
          <p className="text-sm text-gray-500">
            Creates the account and takes you straight into the same setup wizard every business goes through, so you
            fill in the rest yourself: brand colours, photos, template, everything.
          </p>
        </div>
        <AddBusinessForm />
      </div>
    </main>
  );
}
