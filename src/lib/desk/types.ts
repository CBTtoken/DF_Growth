export type DeskArea = "personal" | "business";
export type DeskEffort = "shallow" | "deep";
export type DeskStatus = "open" | "done" | "parked" | "killed";
export type DeskStream = "own" | "client" | "life";
export type DeskRecurrence = "none" | "weekly" | "monthly" | "quarterly" | "annually";

export type DeskItem = {
  id: string;
  title: string;
  area: DeskArea;
  stream: DeskStream;
  venture: string | null;
  next_action: string | null;
  effort: DeskEffort;
  blocked_by: string;
  blocked_since: string | null;
  due_date: string | null;
  status: DeskStatus;
  park_trigger: string | null;
  killed_at: string | null;
  recurrence: DeskRecurrence;
  skip_count: number;
  notes: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeskAsset = {
  id: string;
  name: string;
  type: "domain" | "subscription" | "account" | "tool" | "other";
  provider: string | null;
  area: DeskArea;
  cost_zar_monthly: number | null;
  billing_cycle: "monthly" | "annual" | "once" | "unknown";
  renewal_date: string | null;
  where_login_lives: string | null;
  status: "active" | "cancel" | "unknown";
  notes: string | null;
};

// A venture is a thing being built. The only field that matters is what done
// looks like, which is why there is no priority and no urgency here.
export type DeskVenture = {
  id: string;
  name: string;
  stream: DeskStream;
  end_state: string | null;
  status: "active" | "parked" | "killed";
  notes: string | null;
};

export type DeskNote = {
  id: string;
  heading: string;
  body: string | null;
  position: number;
};

export type DeskIdea = {
  id: string;
  board: string;
  heading: string | null;
  body: string | null;
  became_item_id: string | null;
  position: number;
  created_at: string;
};

// Today's three states. The operator picks one; each maps to a different
// selection rule, never to a different list.
export type DeskState = "wrecked" | "normal" | "sharp";

export function isDeskState(value: unknown): value is DeskState {
  return value === "wrecked" || value === "normal" || value === "sharp";
}

export const STREAMS: { key: DeskStream; label: string; blurb: string }[] = [
  { key: "own", label: "Mine", blurb: "DigitalFlyer SA and everything under it" },
  { key: "client", label: "Clients", blurb: "Other people's businesses" },
  { key: "life", label: "Life", blurb: "Home, family, health, admin" },
];

export function streamLabel(stream: DeskStream): string {
  return STREAMS.find((s) => s.key === stream)?.label ?? stream;
}

// Anything that is not "me" is somebody else's turn, including the literal
// string "date" for an item waiting on a date rather than a person.
export function isBlockedByOther(item: Pick<DeskItem, "blocked_by">): boolean {
  return item.blocked_by !== "me";
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00Z`).getTime();
  return Math.floor((then - Date.now()) / 86_400_000);
}

// "3 days", not "3d". The whole point of the Waiting On screen is that it
// reads at a glance.
export function daysLabel(date: string | null): string {
  const days = daysSince(date);
  if (days === null) return "no date set";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// Used on Horizon, where the question is how long is left rather than how
// long it has been.
export function untilLabel(date: string | null): string {
  const days = daysUntil(date);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} days late`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// Effort in the words he uses it in, rather than the database's words. The
// point of showing it per venture is to tell focus work from break work.
export function effortLabel(effort: DeskEffort): string {
  return effort === "deep" ? "needs a clear head" : "can be done tired";
}

export function nextDueDate(from: string | null, recurrence: DeskRecurrence): string | null {
  if (recurrence === "none") return null;

  // Counted from the due date where there is one, so a monthly item stays on
  // its day of the month even when it is finished late.
  const base = from ? new Date(`${from}T00:00:00Z`) : new Date();
  const next = new Date(base.getTime());

  if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (recurrence === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (recurrence === "annually") next.setUTCFullYear(next.getUTCFullYear() + 1);

  return next.toISOString().slice(0, 10);
}
