// Found via real UAT: the only way back to the dashboard was a small gray
// footer link shown to every visitor, which a real business owner testing
// their own live page didn't notice at all. This only renders for the
// actual authenticated owner of this specific page (checked server-side in
// page.tsx against growth_members, not just "someone is logged in") — a
// customer browsing the same page never sees it, so it stays out of the way
// of the actual sales page.
export function OwnerBar() {
  return (
    <div className="flex items-center justify-center gap-3 bg-ink px-4 py-2.5 text-center text-sm text-white">
      <span>You&apos;re viewing your live page.</span>
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
      >
        Go to your dashboard →
      </a>
    </div>
  );
}
