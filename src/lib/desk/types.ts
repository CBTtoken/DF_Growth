export type DeskArea = "personal" | "business";
export type DeskEffort = "shallow" | "deep";
export type DeskStatus = "open" | "done" | "parked" | "killed";

export type DeskItem = {
  id: string;
  title: string;
  area: DeskArea;
  venture: string | null;
  next_action: string | null;
  effort: DeskEffort;
  blocked_by: string;
  blocked_since: string | null;
  due_date: string | null;
  status: DeskStatus;
  park_trigger: string | null;
  killed_at: string | null;
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

// Today's three states. The operator picks one; each maps to a different
// selection rule, never to a different list.
export type DeskState = "wrecked" | "normal" | "sharp";

export function isDeskState(value: unknown): value is DeskState {
  return value === "wrecked" || value === "normal" || value === "sharp";
}

// Anything that is not "me" is somebody else's turn, including the literal
// string "date" for an item waiting on a date rather than a person.
export function isBlockedByOther(item: Pick<DeskItem, "blocked_by">): boolean {
  return item.blocked_by !== "me";
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00Z`).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
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
