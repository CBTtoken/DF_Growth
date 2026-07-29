import Link from "next/link";

// One button, replacing the setup checklist that used to sit on the home
// screen.
//
// Dewald, 29 July 2026, looking at his own phone: the checklist filled the
// whole first screen with three expanded steps, a progress bar and a
// paragraph of explanation, for information a member needs roughly twice
// in their life. He asked for "just add one button at the end, Set up your
// business, and that opens the sections they need to configure".
//
// So the detail moves to the settings page where it belongs, and the home
// screen keeps a single line telling them something is outstanding and
// what it costs them. Naming the consequence rather than the task is
// deliberate: "no banking details" means nothing to a plumber, "customers
// cannot pay you" means everything.
//
// Disappears entirely once both are done, rather than becoming a permanent
// green tick nobody reads.
export function SetupButton({
  hasBusinessDetails,
  hasBankDetails,
}: {
  hasBusinessDetails: boolean;
  hasBankDetails: boolean;
}) {
  if (hasBusinessDetails && hasBankDetails) return null;

  // The sharper of the two, because it is the one that costs them money.
  const reason = !hasBankDetails
    ? "Your customers cannot pay you until your banking details are in."
    : "Your business name and address print on every document. Yours are missing.";

  const remaining = (hasBusinessDetails ? 0 : 1) + (hasBankDetails ? 0 : 1);

  return (
    <Link
      href="/bizup/settings"
      className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:border-amber-300"
    >
      <span className="min-w-0">
        <span className="block text-base font-bold text-amber-900">Set up your business</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-amber-900">{reason}</span>
        <span className="mt-1 block text-xs font-medium text-amber-700">
          {remaining === 1 ? "1 thing left, about a minute" : "2 things left, about two minutes"}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-2xl leading-none text-amber-700">
        &rsaquo;
      </span>
    </Link>
  );
}
