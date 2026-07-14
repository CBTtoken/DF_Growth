import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeGrowthClientStatus } from "@/lib/growth-client/admin-status-label";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { MarketplaceUrlForm } from "@/components/admin/MarketplaceUrlForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
    <span className="text-sm text-gray-900">{value?.trim() ? value : "—"}</span>
  </div>
);

// Combined spec Sec 11: everything a client supplied through onboarding, in
// one place — Dewald needs this directly to build clients' Stoep
// Marketplace pages, and the admin list itself deliberately stays a
// scannable summary rather than growing this many fields into it.
export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminUser = await requireAdminEmail();

  if ("error" in adminUser) {
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

  const admin = createAdminClient();
  const { data: client } = await admin.from("growth_clients").select("*").eq("id", id).single();

  if (!client) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Client not found</h1>
        </div>
      </main>
    );
  }

  const [{ data: landingPage }, { count: photoCount }, { count: testimonialCount }] = await Promise.all([
    admin
      .from("landing_pages")
      .select("headline, subheadline, about_text, services_text, cta_label, published")
      .eq("growth_client_id", id)
      .maybeSingle(),
    admin.from("client_photos").select("id", { count: "exact", head: true }).eq("growth_client_id", id),
    admin.from("testimonials").select("id", { count: "exact", head: true }).eq("growth_client_id", id),
  ]);

  const statusLabel = describeGrowthClientStatus({
    plan: client.plan,
    status: client.status,
    paystack_reference: client.paystack_reference,
    contact_email: client.contact_email,
    business_description: client.business_description,
    brand_primary_color: client.brand_primary_color,
    template: client.template,
    has_landing_page: Boolean(landingPage),
    packages: client.packages,
    meta_pixel_id: client.meta_pixel_id,
    meta_setup_requested_help: client.meta_setup_requested_help,
  });

  const packages = (client.packages as { name: string; price: string; description: string; type?: string }[] | null) ?? [];
  const pageUrl = client.slug ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${client.slug}` : null;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{client.business_name}</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{statusLabel}</span>
          </div>
          <a
            href={`/api/admin/export?client=${client.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
          >
            Export this client as CSV ↓
          </a>
        </div>

        {pageUrl && (
          <a href={pageUrl} target="_blank" rel="noreferrer" className="w-fit text-sm font-semibold text-brand hover:underline">
            {pageUrl} ↗
          </a>
        )}

        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field label="Plan" value={client.plan} />
          <Field label="Billing cycle" value={client.billing_cycle} />
          <Field label="Founding member" value={client.is_founding_member ? `Yes, #${client.founding_signup_number}` : "No"} />
          <Field label="Signed up" value={new Date(client.created_at).toLocaleString()} />
          <Field label="Trial ends" value={client.trial_ends_at ? new Date(client.trial_ends_at).toLocaleDateString() : null} />
          <Field label="Consented at" value={client.consented_at ? new Date(client.consented_at).toLocaleString() : null} />
          <Field label="Marketing opt-in" value={client.marketing_consent ? "Yes" : "No"} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Contact & business details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact email" value={client.contact_email} />
            <Field label="Call number" value={client.call_phone} />
            <Field label="WhatsApp number" value={client.whatsapp_phone} />
            <Field label="Province" value={client.province} />
            <Field label="Industry" value={client.industry} />
            <Field label="Business address" value={client.business_address} />
            <Field label="Tagline" value={client.tagline} />
          </div>
          <Field label="Business description" value={client.business_description} />
          <Field label="Products / services" value={client.products_services} />
          <Field label="Additional notes" value={client.additional_notes} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facebook" value={client.facebook_url} />
            <Field label="Instagram" value={client.instagram_url} />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Page content</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Template" value={client.template} />
            <Field label="Photos uploaded" value={String(photoCount ?? 0)} />
            <Field label="Testimonials" value={String(testimonialCount ?? 0)} />
            <Field label="Page published" value={landingPage?.published ? "Yes" : "No"} />
          </div>
          <Field label="Headline" value={landingPage?.headline} />
          <Field label="Subheadline" value={landingPage?.subheadline} />
          <Field label="About text" value={landingPage?.about_text} />
          <Field label="Services text" value={landingPage?.services_text} />
        </section>

        {packages.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-ink">Packages</h2>
            <ul className="flex flex-col gap-2">
              {packages.map((p, i) => (
                <li key={i} className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-gray-900">{p.name}</span>
                  {p.price && <span className="ml-2 text-gray-600">{p.price}</span>}
                  {p.description && <p className="mt-0.5 text-gray-500">{p.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Marketplace listing</h2>
            {/* Public Beta Polish Sprint Sec 4: distinct from page-live
                status — a Foundation client on their free trial has a live
                page (client.status === "active") well before they've ever
                paid, so this reads paystack_reference specifically rather
                than reusing the same status badge shown up top. */}
            <p className="mt-1 text-sm text-gray-500">
              {client.paystack_reference
                ? "Unlocked — this account has paid at least once."
                : "Locked — this account hasn't paid yet (still on a free trial)."}
            </p>
          </div>
          <MarketplaceUrlForm clientId={client.id} initialUrl={client.marketplace_url} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Meta ad connection</h2>
          {client.plan === "foundation" ? (
            <p className="text-sm text-gray-500">Not applicable on Foundation.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pixel ID" value={client.meta_pixel_id} />
              <Field label="Ad account ID" value={client.meta_ad_account_id} />
              <Field label="Requested help" value={client.meta_setup_requested_help ? "Yes" : "No"} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
