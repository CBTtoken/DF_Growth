import { INDUSTRY_TAXONOMY } from "@/lib/industries";

// SEO fix: JSON-LD always used the generic "LocalBusiness" @type, giving
// search engines no signal about what kind of business this actually is —
// a real, concrete ranking factor for unbranded local search ("plumber
// near me"). growth_clients.industry stores a subcategory string (e.g.
// "Plumbing"), so this reverse-looks-up its parent category, then maps
// that to the closest real Schema.org LocalBusiness subtype. Falls back to
// the generic "LocalBusiness" for OTHER_INDUSTRY / free-text / unmatched
// values — a wrong specific type would be worse than an honest generic one.
const CATEGORY_TO_SCHEMA_TYPE: Record<string, string> = {
  "Beauty & Wellness": "HealthAndBeautyBusiness",
  "Clothing & Fashion": "ClothingStore",
  "Food & Beverage": "FoodEstablishment",
  "Skilled Trades & Repairs": "HomeAndConstructionBusiness",
  "Home, Garden & Care": "HomeAndConstructionBusiness",
  "Arts, Crafts & Makers": "Store",
  "Professional & Digital Services": "ProfessionalService",
  "Education & Lessons": "EducationalOrganization",
  "Automotive & Transport": "AutomotiveBusiness",
  "Events & Entertainment": "EntertainmentBusiness",
};

export function schemaTypeForIndustry(industry: string | null): string {
  if (!industry) return "LocalBusiness";
  const category = INDUSTRY_TAXONOMY.find((c) => c.subcategories.includes(industry));
  if (!category) return "LocalBusiness";
  return CATEGORY_TO_SCHEMA_TYPE[category.name] ?? "LocalBusiness";
}
