// Job 5 of the moderation handoff: "Publish it short and visible at the
// point of posting, not buried in terms."
//
// DRAFT COPY. Dewald approves the final wording before launch -- this is
// what ships until then, not a decision.

export function BannedListNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
      <p>
        A few things don&apos;t belong here: money-lending or credit offers, network-marketing or recruitment,
        firearms, alcohol or tobacco, medicines or health claims, adult content, live animals, event tickets, and
        job adverts (a jobs section is planned, not open yet). Everything else, go ahead.
      </p>
    </div>
  );
}
