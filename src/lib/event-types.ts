// List Your Event Sec 3: "workshop, market, community, fundraiser, and
// similar... Claude Code's discretion on the exact list, keep it short and
// genuinely useful." Single source of truth for both the submission form's
// dropdown and the public browse filter — the database check constraint
// (supabase/migrations/20260716180000_add_events.sql) must stay in sync
// with the `value`s here.
export const EVENT_TYPES = [
  { value: "workshop", label: "Workshop" },
  { value: "market", label: "Market" },
  { value: "community", label: "Community" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "sports", label: "Sports" },
  { value: "arts-culture", label: "Arts & Culture" },
  { value: "other", label: "Other" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];
