import type { OgMarket, OgDelivery } from "./OldGoodExperience";

// Sample markets, from the reference build. Real records come later if
// Jordan says yes: the platform's events are public and account-owned, and
// inventing public events for a demo would put fake dates on the real
// /events page. Edit here until then.
export const OG_MARKETS: OgMarket[] = [
  {
    name: "Saturday morning market",
    when: "Sat 08:00 to 13:00",
    where: "Church Square",
    note: "Every Saturday. Reserve online and collect at the stall, or just come and dig through the rail.",
  },
  {
    name: "First Thursday night market",
    when: "Thu 17:00 to 21:00",
    where: "Baakens Valley",
    note: "Once a month. Smaller rail, better pieces, card and cash both taken at the stall.",
  },
  {
    name: "Vintage fair",
    when: "Sun 09:00 to 15:00",
    where: "Walmer town hall",
    note: "Quarterly. Watch the drop alerts for the date.",
  },
];

// Published 2026 figures from the reference build, displayed as flat rates.
// Not live quotes; re-check before anything goes live for real.
export const OG_DELIVERY: OgDelivery[] = [
  { id: "pudo", label: "PUDO locker to locker", note: "Around R60 nationwide, 1 to 3 days. Collect from a locker any time of day with a PIN.", priceCents: 6000 },
  { id: "paxi", label: "PAXI, PEP store to PEP store", note: "Around R60, 7 to 9 days. Over 2,500 PEP stores, so it reaches almost anywhere.", priceCents: 6000 },
  { id: "door", label: "Courier to your door", note: "From about R109 nationwide, quoted properly when this shop goes live.", priceCents: 10900 },
  { id: "market", label: "Collect at the market, free", note: "Pick it up at the stall and try it on before you take it.", priceCents: 0 },
];

export const OG_FREE_OVER_CENTS = 75000;
