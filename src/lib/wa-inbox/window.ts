// The 24-hour customer service window, in one place so the webhook flow,
// the admin server actions and the countdown UI can never disagree about
// it. The window is anchored on the last INBOUND message; every message
// from the customer resets it, including a thumbs up.

export const WINDOW_HOURS = 24;
// "At roughly hour 20" (handoff section 6): from here on, a silent thread
// offers Dewald the one-tap nudge.
export const NUDGE_OFFER_HOURS = 20;

export function windowClosesAt(lastInboundAt: string | Date): Date {
  const anchor = new Date(lastInboundAt);
  return new Date(anchor.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
}

export function isWindowOpen(lastInboundAt: string | Date | null): boolean {
  if (!lastInboundAt) return false;
  return windowClosesAt(lastInboundAt).getTime() > Date.now();
}

export function hoursSince(at: string | Date): number {
  return (Date.now() - new Date(at).getTime()) / (60 * 60 * 1000);
}
