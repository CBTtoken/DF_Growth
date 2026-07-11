import type { Metadata } from "next";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandHeader } from "@/components/brand/BrandHeader";

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
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = !!user?.email && allowlist.includes(user.email.toLowerCase());

  if (!user || !isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Not available</h1>
          <p className="text-sm text-gray-500">
            {user ? "This login doesn't have admin access." : "Sign in with an admin account to view this page."}
          </p>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email, plan, status, meta_pixel_id, meta_setup_requested_help, created_at")
    .order("created_at", { ascending: false });

  const needsMetaHelp = (clients ?? []).filter((c) => c.plan !== "foundation" && !c.meta_pixel_id && c.meta_setup_requested_help);

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <BrandHeader />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Admin</h1>

        {needsMetaHelp.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
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
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-brand">
                    {c.plan}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">All growth clients ({clients?.length ?? 0})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Meta</th>
                  <th className="py-2 pr-4">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{c.business_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.contact_email ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.plan}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {c.plan === "foundation"
                        ? "—"
                        : c.meta_pixel_id
                          ? "Connected"
                          : c.meta_setup_requested_help
                            ? "Needs help"
                            : "Not connected"}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
