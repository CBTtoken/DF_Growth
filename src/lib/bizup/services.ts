// What a KatisoBiz member actually does.
//
// A fixed list rather than free text, because the Members List has to be
// browsable by trade and "Plumber", "plumbing", "Plumbing & Drains" and
// "PLUMBER" would otherwise all be separate categories within a week.
//
// The list is the trades the landing page already targets, plus the ones a
// one-bakkie business in South Africa most commonly is. Kept short on
// purpose: a long list makes a member scroll to find themselves, and every
// extra category splits an already small page into thinner sections.

export interface ServiceType {
  id: string;
  /** What the member picks, and what a customer reads. */
  label: string;
  /** Plural, for a section heading on the Members List. */
  plural: string;
}

export const SERVICE_TYPES: ServiceType[] = [
  { id: "plumber", label: "Plumber", plural: "Plumbers" },
  { id: "electrician", label: "Electrician", plural: "Electricians" },
  { id: "handyman", label: "Handyman", plural: "Handymen" },
  { id: "builder", label: "Builder", plural: "Builders" },
  { id: "painter", label: "Painter", plural: "Painters" },
  { id: "tiler", label: "Tiler", plural: "Tilers" },
  { id: "roofer", label: "Roofer", plural: "Roofers" },
  { id: "paving", label: "Paving and driveways", plural: "Paving and driveways" },
  { id: "welder", label: "Welder", plural: "Welders" },
  { id: "carpenter", label: "Carpenter", plural: "Carpenters" },
  { id: "mechanic", label: "Mechanic", plural: "Mechanics" },
  { id: "aircon", label: "Air conditioning and refrigeration", plural: "Air conditioning and refrigeration" },
  { id: "solar", label: "Solar and inverters", plural: "Solar and inverters" },
  { id: "appliance", label: "Appliance repairs", plural: "Appliance repairs" },
  { id: "garden", label: "Garden services", plural: "Garden services" },
  { id: "tree_felling", label: "Tree felling", plural: "Tree felling" },
  { id: "cleaning", label: "Cleaning services", plural: "Cleaning services" },
  { id: "pest", label: "Pest control", plural: "Pest control" },
  { id: "pools", label: "Swimming pools", plural: "Swimming pools" },
  { id: "security", label: "Gates, fencing and security", plural: "Gates, fencing and security" },
  { id: "moving", label: "Moving and transport", plural: "Moving and transport" },
  { id: "other", label: "Something else", plural: "Other services" },
];

export function serviceLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return SERVICE_TYPES.find((s) => s.id === id)?.label ?? null;
}

export function servicePlural(id: string | null | undefined): string {
  if (!id) return "Other services";
  return SERVICE_TYPES.find((s) => s.id === id)?.plural ?? "Other services";
}

export function isServiceType(value: unknown): boolean {
  return typeof value === "string" && SERVICE_TYPES.some((s) => s.id === value);
}
