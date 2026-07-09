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
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <BrandHeader />
        <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
        <p className="text-gray-500 max-w-sm">
          Use the magic link we sent you to get here — this page needs you to be signed in.
        </p>
      </main>
    );
  }

  const admin = createAdminClient();
  const [{ data: growthClient }, { data: testimonials }, { data: assets }, { data: secret }, { data: capiEvents }] =
    await Promise.all([
      admin.from("growth_clients").select("plan, meta_pixel_id").eq("id", client.id).single(),
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16">
      <div className="flex flex-col gap-6">
        <BrandHeader />
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Testimonials</h2>
        <AddTestimonialForm />
        <ul className="flex flex-col gap-2">
          {(testimonials ?? []).map((t) => (
            <li key={t.id} className="rounded border border-gray-200 p-3 text-sm">
              <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-1 text-gray-500">
                — {t.author_name}
                {t.rating ? ` · ${"★".repeat(t.rating)}` : ""}
              </p>
            </li>
          ))}
          {(!testimonials || testimonials.length === 0) && (
            <p className="text-sm text-gray-400">No testimonials yet.</p>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Generated social assets</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(assets ?? []).map((a) => (
            <a
              key={a.id}
              href={`${storageBase}/${a.image_path}`}
              target="_blank"
              rel="noreferrer"
              download
              className="flex flex-col gap-1"
            >
              <Image
                src={`${storageBase}/${a.image_path}`}
                alt="Generated testimonial asset"
                width={300}
                height={300}
                className="aspect-square w-full rounded border border-gray-200 object-cover"
              />
              <span className="text-xs text-gray-500 underline">Download</span>
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
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Meta ad tracking</h2>
          <MetaTokenForm hasToken={!!secret} />

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Recent delivery status</h3>
            <ul className="flex flex-col gap-1">
              {(capiEvents ?? []).map((e) => (
                <li key={e.id} className="flex justify-between rounded border border-gray-200 px-3 py-2 text-xs">
                  <span>{e.event_name}</span>
                  <span className={e.response_status === 200 ? "text-green-600" : "text-red-600"}>
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
    </main>
  );
}
