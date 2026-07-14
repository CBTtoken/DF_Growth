import { BrandHeader } from "@/components/brand/BrandHeader";

// Rendered by Next.js whenever forbidden() is called from anywhere under
// /admin (see page.tsx and clients/[id]/page.tsx) — same copy the old
// inline 200 response used, but now paired with a real HTTP 403.
export default function AdminForbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-ink">Not available</h1>
        <p className="text-sm text-gray-500">Sign in with an admin account to view this page.</p>
      </div>
    </main>
  );
}
