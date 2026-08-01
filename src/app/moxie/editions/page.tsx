import type { Metadata } from "next";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { EditionCard } from "@/components/moxie/EditionCard";
import { listEditions } from "@/lib/moxie/editions";
import { getReader } from "@/lib/moxie/entitlement";
import { moxieCanonical } from "@/lib/moxie/host";

export const metadata: Metadata = {
  title: "Every edition",
  description:
    "Every edition of Moxie Magazine, South Africa's family discovery magazine. Editions open to all readers 60 days after publication.",
  alternates: { canonical: moxieCanonical("/editions") },
};

// Rendered per request, not cached. Every page here reads the session to
// decide what the header and the buttons say, and reading the session makes
// a route dynamic, so a revalidate value on these files would be a no-op
// claiming a cache that never happens.
export const dynamic = "force-dynamic";

export default async function EditionsPage() {
  const [editions, reader] = await Promise.all([listEditions(), getReader()]);

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn={Boolean(reader)} />

      <section className="bg-moxie-charcoal">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
          <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
            The archive
          </p>
          <h1 className="font-moxie-display mt-3 text-4xl leading-[1.1] font-bold text-white sm:text-5xl">
            Every edition
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-moxie-cream/80">
            A new edition on the 1st of every month. Every edition opens to all readers 60 days
            after it is published, and members read each one the day it comes out.
          </p>
        </div>
      </section>

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          {editions.length === 0 ? (
            <div className="border border-dashed border-moxie-border bg-white p-16 text-center">
              <p className="font-moxie-display text-xl font-bold text-moxie-charcoal">
                The archive is on its way
              </p>
              <p className="mt-2 text-sm text-moxie-charcoal/60">
                Editions appear here as they are published.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {editions.map((edition) => (
                <EditionCard key={edition.id} edition={edition} />
              ))}
            </div>
          )}
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
