import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ilikeAcross } from "@/lib/bizup/search";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// BizUp/docs/bizup-phase1-spec.md Sec 15.2, the customer list.
export default async function BizUpCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { q, error } = await searchParams;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  let query = admin
    .from("bizup_customers")
    .select("id, name, is_business, whatsapp, phone, email, city")
    .eq("account_id", account.id)
    .order("name");

  // Matches on name, and on the two things a member is most likely to
  // search by when the name escapes them: the number they phoned and the
  // town they drove to. Built through ilikeAcross rather than by string
  // concatenation, because a term containing a comma otherwise breaks the
  // whole filter.
  const filter = q ? ilikeAcross(["name", "whatsapp", "phone", "city"], q) : null;
  if (filter) query = query.or(filter);

  const { data: customers, error: queryError } = await query;
  const results = customers ?? [];

  // Checked rather than assumed. A failed query and a genuinely empty
  // result set both produce an empty list, and telling a member "no
  // customers match" when the search actually broke would send them
  // looking for a record they would swear they had saved.
  if (queryError) console.error("KatisoBiz customer search failed", queryError);

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href="/bizup"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to KatisoBiz
        </Link>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">Customers</h1>
          <Link
            href="/bizup/customers/new"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Add customer
          </Link>
        </div>

        {error === "cannot-delete" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            That customer cannot be removed because they appear on documents you have already
            issued. Those records have to be kept.
          </p>
        )}

        {/* A plain GET form, so a search survives a refresh and can be
            shared or bookmarked, and works with no JavaScript at all. */}
        <form action="/bizup/customers" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name, number or town"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
          >
            Search
          </button>
        </form>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              {q?.trim()
                ? `No customers match "${q.trim()}".`
                : "No customers yet. Add one now, or add them as you go while building a quote."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/bizup/customers/${c.id}`}
                  className="flex flex-col gap-0.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
                >
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="text-sm text-gray-500">
                    {[c.is_business ? "Business" : null, c.city, c.whatsapp ?? c.phone ?? c.email]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
