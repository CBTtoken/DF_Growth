import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { AddTestimonialForm } from "@/components/dashboard/AddTestimonialForm";
import { MetaTokenForm } from "@/components/dashboard/MetaTokenForm";
import { MetaIdsForm } from "@/components/dashboard/MetaIdsForm";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { EcosystemAccess } from "@/components/EcosystemAccess";
import { PlatformFeatures } from "@/components/dashboard/PlatformFeatures";
import { AccountSection } from "@/components/dashboard/AccountSection";
import { ChangeTemplateSection } from "@/components/dashboard/ChangeTemplateSection";
import { PhotoGallery } from "@/components/dashboard/PhotoGallery";
import { AssetStyleSection } from "@/components/dashboard/AssetStyleSection";
import { SocialAssetGenerator } from "@/components/dashboard/SocialAssetGenerator";
import { DomainVerificationForm } from "@/components/dashboard/DomainVerificationForm";
import { ProfileCompletenessBanner } from "@/components/dashboard/ProfileCompletenessBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { logOut } from "@/app/dashboard/actions";

// Private, signed-in-only — see onboard/page.tsx for the same reasoning.
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
        <SiteFooter />
      </main>
    );
  }

  const admin = createAdminClient();
  const [
    { data: growthClient },
    { data: testimonials },
    { data: assets },
    { data: secret },
    { data: capiEvents },
    { data: leads },
    { data: photos },
  ] = await Promise.all([
    admin
      .from("growth_clients")
      .select(
        "business_name, slug, plan, status, template, asset_style, meta_pixel_id, meta_setup_requested_help, google_site_verification, facebook_domain_verification, business_description, business_address, hero_photo_id, industry, website_url, marketplace_url, paystack_reference"
      )
      .eq("id", client.id)
      .single(),
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
    // Found via real UAT: leads were being captured with no way for a
    // client to ever see them — this is the first read of the leads table
    // anywhere in the codebase.
    admin
      .from("leads")
      .select("id, name, email, phone, message, created_at")
      .eq("growth_client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("client_photos")
      .select("id, storage_path")
      .eq("growth_client_id", client.id)
      .order("position", { ascending: true }),
  ]);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-assets`;
  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;
  // Found via real UAT: this used to also require meta_pixel_id to be set,
  // which meant a client who picked "I don't know / need help" during
  // onboarding never saw this section again — no confirmation their request
  // was captured, no way to self-serve if they later found the details.
  // Foundation clients still never see this; they never connect Meta at all.
  const showMetaSection = growthClient?.plan !== "foundation";
  const pageUrl = growthClient?.slug ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/g/${growthClient.slug}` : null;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandHeader />
            {/* Combined spec Sec 28: there was previously no way at all to
                end a session on a shared/borrowed device. A plain form
                posting to a Server Action, not a client-side button, so it
                works with JS disabled and clears the auth cookie
                server-side. */}
            <form action={logOut}>
              <button
                type="submit"
                className="text-sm font-medium text-gray-400 underline-offset-2 transition hover:text-gray-600 hover:underline"
              >
                Log out
              </button>
            </form>
          </div>
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
            <Link
              href="/dashboard/edit"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
            >
              Edit your page
            </Link>
          </div>
        </div>

        <ProfileCompletenessBanner
          hasBusinessDescription={Boolean(growthClient?.business_description)}
          hasBusinessAddress={Boolean(growthClient?.business_address)}
          photoCount={photos?.length ?? 0}
        />

        <ChangeTemplateSection currentTemplate={growthClient?.template ?? "conversion"} />

        <PhotoGallery
          photos={photos ?? []}
          storageBase={photosStorageBase}
          heroPhotoId={growthClient?.hero_photo_id ?? null}
          industryHint={growthClient?.industry ?? undefined}
        />

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Leads ({leads?.length ?? 0})</h2>
          <ul className="flex flex-col gap-2">
            {(leads ?? []).map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{l.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-gray-500">
                      <a href={`mailto:${l.email}`} className="text-brand underline-offset-2 hover:underline">
                        {l.email}
                      </a>
                      {l.phone && (
                        <>
                          <span aria-hidden>·</span>
                          <a href={`tel:${l.phone.replace(/\s+/g, "")}`} className="text-brand underline-offset-2 hover:underline">
                            {l.phone}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                {l.message && <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-gray-600">{l.message}</p>}
              </li>
            ))}
            {(!leads || leads.length === 0) && (
              <p className="text-sm text-gray-400">
                No leads yet — this fills in as soon as someone contacts you through your page.
              </p>
            )}
          </ul>
        </section>

        {/* Combined spec Sec 23: moved down from right after the header —
            plan/billing is real but not what a client opens the dashboard
            to actually do day to day. Leads and page-management (template,
            photos) now come first. */}
        {growthClient && client.id && (
          <AccountSection growthClientId={client.id} plan={growthClient.plan} status={growthClient.status} />
        )}
        <PlatformFeatures plan={growthClient?.plan ?? null} />

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

        <AssetStyleSection currentStyle={growthClient?.asset_style ?? "clean"} />

        <SocialAssetGenerator photos={photos ?? []} storageBase={photosStorageBase} />

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
                Assets appear here once you add a testimonial or generate one above.
              </p>
            )}
          </div>
        </section>

        {/* Public Beta Polish Sprint Sec 10: moved one section higher (was
            below Meta ad tracking) so it's more prominent post-onboarding —
            the two sections' cross-reference copy is flipped below to match
            (this one now comes first, so it points "below" at Meta ad
            tracking instead of "above"). */}
        <section id="search-ad-verification" className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Search &amp; ad platform verification</h2>
            {/* Combined spec Sec 26: plain-language explanation + cross-
                reference to Meta ad tracking, which is a related but
                separate thing (that one's for tracking ad campaign
                results; this one's for proving you own this page to
                Google/Facebook's own tools). Only shown to Growth-tier
                clients, who have both sections — Foundation never sees
                Meta ad tracking at all. */}
            <p className="mt-1 text-sm text-gray-500">
              This helps your page show up correctly in Google Search Console and Facebook Business
              tools you may already have.
              {showMetaSection && (
                <>
                  {" "}
                  Tracking Meta ad campaigns instead? See{" "}
                  <a href="#meta-ad-tracking" className="font-semibold text-brand hover:underline">
                    Meta ad tracking
                  </a>{" "}
                  below.
                </>
              )}
            </p>
          </div>
          <DomainVerificationForm
            initialGoogle={growthClient?.google_site_verification ?? ""}
            initialFacebook={growthClient?.facebook_domain_verification ?? ""}
          />
        </section>

        {showMetaSection && (
          <section id="meta-ad-tracking" className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Meta ad tracking</h2>
              {/* Combined spec Sec 26: cross-references the search/domain
                  verification section above, since they're easy to confuse
                  — this one is specifically about Meta ad campaigns. */}
              <p className="mt-1 text-sm text-gray-500">
                For tracking Meta (Facebook/Instagram) ad campaigns specifically. Setting up Google
                Search Console or Facebook Business verification instead? See{" "}
                <a href="#search-ad-verification" className="font-semibold text-brand hover:underline">
                  Search &amp; ad platform verification
                </a>{" "}
                above.
              </p>
            </div>

            {!growthClient?.meta_pixel_id && growthClient?.meta_setup_requested_help && (
              <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-gray-700">
                You told us during signup you&apos;d like help connecting your Meta account — our
                team will be in touch. If you find your Pixel ID and Ad Account ID before then,
                add them yourself below and this section will switch on right away.
              </p>
            )}

            {!growthClient?.meta_pixel_id ? (
              <MetaIdsForm />
            ) : (
              <>
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
              </>
            )}
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Also available to you</h2>
            <p className="mt-1 text-sm text-gray-500">
              As a Growth client, you&apos;re also part of the wider DigitalFlyer SA ecosystem.
            </p>
          </div>
          <EcosystemAccess
            marketplaceUrl={growthClient?.marketplace_url ?? null}
            unlocked={!!growthClient?.paystack_reference}
          />
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
