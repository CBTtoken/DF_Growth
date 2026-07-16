import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventSubmissionForm } from "@/components/events/EventSubmissionForm";

export const metadata: Metadata = {
  title: "List Your Event",
  description: "List your event on DigitalFlyer Growth for free — no account fees, no ticketing step, ever.",
};

// List Your Event Sec 2: "anyone... can register a free account and list
// an event, no cost, ever." Checks the current session server-side so an
// already-logged-in visitor (an existing Growth business owner included)
// never sees signup/login fields at all — EventSubmissionForm renders a
// genuinely different form shape based on this, not just hidden fields.
export default async function ListYourEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">List Your Event</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Get your event in front of people nearby</h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            Free, always — no account fees, no ticketing step, ever. Fill in the details below and it goes live
            immediately.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <EventSubmissionForm isLoggedIn={!!user} />
      </section>

      <SiteFooter />
    </main>
  );
}
