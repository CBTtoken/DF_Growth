"use client";

import { useFormStatus } from "react-dom";

// A submit button that admits it is working.
//
// Dewald, 30 July: "there is a bit of a click lag on the app". Half of it
// was real and fixed by moving the server next to the database. The other
// half is this: a form button that looks identical before and after being
// pressed. Even a fast round trip reads as a dead button if nothing on the
// screen acknowledges the tap, and the instinct is to press it again.
//
// The Issue button already did this and felt noticeably better than the
// rest, which is what pointed at the cause.
//
// Disabled while pending, so a second press cannot create a second draft
// against the member's monthly document count.
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  /** What it says while waiting. Kept short: it is read at a glance. */
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
