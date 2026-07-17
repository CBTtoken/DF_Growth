import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { NewClientForm } from "@/components/admin/NewClientForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewClientPage() {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) forbidden();

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <BrandHeader />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Create New Client</h1>
          <p className="mt-1 text-sm text-gray-500">
            For a prospect who&apos;d rather hand over access and let you build their page directly, with no
            self-serve wizard on their end. This creates their account and sends them a set-password email;
            you&apos;ll land on their client page next to build everything and grant access or send a payment
            link whenever you&apos;re ready.
          </p>
        </div>
        <NewClientForm />
      </div>
    </main>
  );
}
