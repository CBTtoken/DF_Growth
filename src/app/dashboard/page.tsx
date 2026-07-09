import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { AddTestimonialForm } from "@/components/dashboard/AddTestimonialForm";
import { MetaTokenForm } from "@/components/dashboard/MetaTokenForm";
import { BrandHeader } from "@/components/brand/BrandHeader";

export default async function DashboardPage() {
  const client = await requireGrowthClientId();

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
          <p className="text-sm text-gray-500">
            Use the magic link we sent you to get here — this page needs you to be signed in.
          </p>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const [{ data: growthClient }, { data: testimonials }, { data: assets }, { data: secret }, { data: capiEvents }] =
    await Promise.all([
      admin.from("growth_clients").select("business_name, slug, plan, meta_pixel_id").eq("id", client.id).single(),
      admin
        .from("testimonials")
        .select("id, author_name, quote, rating, created_at")
        .eq("growth_client_id", client.id)
        .order("created_at", { ascending: false }),
      admin
        .from("generated_assets")
        .select("id, image_path, template, created_at")
        .eq("growth_client_id", client.id)
        .order("created_at", { ascending: false }),
      admin
        .from("growth_client_secrets")
        .select("growth_client_id")
        .eq("growth_client_id", client.id)
        .maybeSingle(),
      admin
        .from("capi_events")
        .select("id, event_name, response_status, sent_at")
        .eq("growth_client_id", client.id)
        .order("sent_at", { ascending: false })
        .limit(10),
    ]);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-assets`;
  const showMetaSection = growthClient?.plan !== "foundation" && !!growthClient?.meta_pixel_id;
  const pageUrl = growthClient?.slug ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${growthClient.slug}` : null;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-6">
          <BrandHeader />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
              {growthClient?.business_name && (
                <p className="mt-1 text-sm text-gray-500">{growthClient.business_name}</p>
              )}
            </div>
            {pageUrl && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                View your page ↗
              </a>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Testimonials</h2>
          <AddTestimonialForm />
          <ul className="flex flex-col gap-2">
            {(testimonials ?? []).map((t) => (
              <li key={t.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1.5 text-gray-500">
                  — {t.author_name}
                  {t.rating ? <span className="text-brand"> · {"★".repeat(t.rating)}</span> : ""}
                </p>
              </li>
            ))}
            {(!testimonials || testimonials.length === 0) && (
              <p className="text-sm text-gray-400">No testimonials yet.</p>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Generated social assets</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(assets ?? []).map((a) => (
              <a
                key={a.id}
                href={`${storageBase}/${a.image_path}`}
                target="_blank"
                rel="noreferrer"
                download
                className="group flex flex-col gap-2"
              >
                <Image
                  src={`${storageBase}/${a.image_path}`}
                  alt="Generated testimonial asset"
                  width={300}
                  height={300}
                  className="aspect-square w-full rounded-xl border border-gray-100 object-cover transition-opacity group-hover:opacity-80"
                />
                <span className="text-xs font-medium text-brand underline-offset-2 group-hover:underline">
                  Download
                </span>
              </a>
            ))}
            {(!assets || assets.length === 0) && (
              <p className="text-sm text-gray-400">
                Assets generate automatically when you add a testimonial.
              </p>
            )}
          </div>
        </section>

        {showMetaSection && (
          <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-ink">Meta ad tracking</h2>
            <MetaTokenForm hasToken={!!secret} />

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Recent delivery status</h3>
              <ul className="flex flex-col gap-1.5">
                {(capiEvents ?? []).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs"
                  >
                    <span className="font-medium text-gray-700">{e.event_name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        e.response_status === 200
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {e.response_status ?? "pending"}
                    </span>
                    <span className="text-gray-400">{new Date(e.sent_at).toLocaleString()}</span>
                  </li>
                ))}
                {(!capiEvents || capiEvents.length === 0) && (
                  <p className="text-xs text-gray-400">
                    No events sent yet — this fills in once your landing page starts getting leads.
                  </p>
                )}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
