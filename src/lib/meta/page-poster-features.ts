// The fixed set of platform features the 08:15/13:30 feature-CTA slots
// cycle through (Dewald, 5 August 2026: "something about one of our
// features cross our app, like Growth-Events, Bookings, Webpage, Shop and
// KatisoBiz Quotes, Invoices, slips"). A closed list rather than free text,
// so the admin screen can offer a dropdown and every post about "Bookings"
// reuses the one image uploaded for it.
export const FEATURE_KEYS = [
  { key: "growth_events", label: "Growth: Events" },
  { key: "growth_bookings", label: "Growth: Bookings" },
  { key: "growth_webpage", label: "Growth: Your webpage" },
  { key: "growth_shop", label: "Growth: Shop" },
  { key: "katisobiz_quotes", label: "KatisoBiz: Quotes" },
  { key: "katisobiz_invoices", label: "KatisoBiz: Invoices" },
  { key: "katisobiz_slips", label: "KatisoBiz: Slips" },
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number]["key"];

export function featureLabel(key: string | null): string {
  return FEATURE_KEYS.find((f) => f.key === key)?.label ?? "General";
}
