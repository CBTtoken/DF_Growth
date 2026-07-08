import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { AddTestimonialForm } from "@/components/dashboard/AddTestimonialForm";

export default async function DashboardPage() {
  const client = await requireGrowthClientId();

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-gray-500 max-w-sm">
          Use the magic link we sent you to get here — this page needs you to be signed in.
        </p>
      </main>
    );
  }

  const admin = createAdminClient();
  const [{ data: testimonials }, { data: assets }] = await Promise.all([
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
  ]);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-assets`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

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
    </main>
  );
}
