import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { listPublicPackages, formatRand } from "@/lib/svc/data";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Smart Value Club membership packages: monthly coupons for Dis-Chem, Checkers, Shoprite and Pick n Pay, the Moxie digital magazine, education benefits and the members draw.",
  alternates: { canonical: svcCanonical("/packages") },
};

// Everything on this page comes from the database: names, prices, benefit
// lists and face values. Changing any of them is a row update, not a
// deploy (handoff Sprint 1 acceptance).
export default async function PackagesPage() {
  const packages = await listPublicPackages("svc");
  const joinHref = await svcPath("/join");

  return (
    <div>
      <section className="bg-svc-green px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">Packages</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            One clear membership. Every benefit listed with its face value, so
            you can see exactly what your money buys before you join.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          {packages.length === 0 ? (
            <div className="border-2 border-svc-ink/15 p-8 text-center">
              <h2 className="font-svc-heading text-xl font-bold">Packages are being finalised</h2>
              <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-svc-ink/75">
                The membership packages and prices are being loaded. Check back
                shortly, or ask us directly through the contact page.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {packages.map((pkg) => (
                <article key={pkg.id} className="border-2 border-svc-ink/15 bg-white/50">
                  <div className="border-b-2 border-svc-ink/10 p-6">
                    <h2 className="font-svc-heading text-2xl font-bold">{pkg.name}</h2>
                    <p className="mt-1 text-2xl font-bold text-svc-green">
                      {formatRand(pkg.monthly_price_cents)}
                      <span className="text-base font-medium text-svc-ink/60"> per month</span>
                    </p>
                    {pkg.annual_price_cents ? (
                      <p className="mt-1 text-sm text-svc-ink/60">
                        Or {formatRand(pkg.annual_price_cents)} a year.
                      </p>
                    ) : null}
                    {pkg.public_description && (
                      <p className="mt-3 max-w-2xl text-base leading-relaxed text-svc-ink/80">
                        {pkg.public_description}
                      </p>
                    )}
                  </div>

                  <ul className="divide-y divide-svc-ink/10">
                    {pkg.benefits.map((b) => (
                      <li key={b.id} className="flex items-start justify-between gap-4 p-5">
                        <div>
                          <h3 className="font-svc-heading text-base font-bold">{b.name}</h3>
                          {b.description && (
                            <p className="mt-1 text-sm leading-relaxed text-svc-ink/70">{b.description}</p>
                          )}
                        </div>
                        {b.face_value_cents > 0 && (
                          <p className="shrink-0 text-sm font-bold text-svc-blue">
                            {formatRand(b.face_value_cents)} value
                          </p>
                        )}
                      </li>
                    ))}
                    <li className="flex items-start justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-svc-heading text-base font-bold">
                          {pkg.free_draw_entries} monthly draw entries
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-svc-ink/70">
                          Automatic with an active membership. No forms, no extra cost.
                        </p>
                      </div>
                    </li>
                  </ul>

                  <div className="flex flex-col items-start justify-between gap-4 border-t-2 border-svc-ink/10 p-6 sm:flex-row sm:items-center">
                    {pkg.faceValueCents > 0 && (
                      <p className="text-base">
                        Total face value:{" "}
                        <span className="font-svc-heading text-xl font-bold text-svc-amber">
                          {formatRand(pkg.faceValueCents)}
                        </span>
                        <span className="block text-xs text-svc-ink/60 sm:inline sm:pl-2">
                          Face value is what the benefits are worth on paper, not a savings promise.
                        </span>
                      </p>
                    )}
                    <Link href={`${joinHref}?package=${pkg.slug}`} className={svcBtnPrimary}>
                      Join for {formatRand(pkg.monthly_price_cents)} a month
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
