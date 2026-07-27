import type { Metadata } from "next";
import Link from "next/link";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { MetaConversion } from "@/components/analytics/MetaConversion";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The thank-you page. Its job is to fire the browser side of the
// conversion using the SAME event_id the server already sent, so Meta
// counts one conversion rather than two. The pixel itself is consent-gated
// by MetaConversion, which is a POPIA requirement and not a preference.
export default async function BizUpWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ ev?: string }>;
}) {
  const { ev } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand-blue-light via-white to-white p-8 text-center">
      <TrackEvent name="sign_up" method="bizup_free" />
      <MetaConversion event="CompleteRegistration" eventId={ev} />

      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-neutral-border bg-white p-10 shadow-card">
        <span className="grid size-14 place-items-center rounded-full bg-brand-blue-light text-2xl text-brand-blue">
          &#10003;
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-ink">You are in.</h1>
        <p className="text-sm text-neutral-mid">
          Add your business details and your banking details once, and every quote you send after
          that takes under a minute.
        </p>
        <Link href="/bizup/settings/business" className="btn-accent-lg mt-3">
          Set up my business
        </Link>
        <Link href="/bizup/quotes" className="text-sm font-medium text-neutral-muted hover:text-brand-blue">
          Skip, take me to quotes
        </Link>
      </div>
    </main>
  );
}
