import { templates, type TemplateId, type HeroVariant } from "@/lib/templates/registry";
import { INDUSTRY_TAXONOMY } from "@/lib/industries";

// Sprint "Onboarding two doors" item 2: until now a self-serve member
// reached the template step with nothing preselected and defaulted to
// Classic Conversion, which is the one layout deliberately kept as the
// lowest-common-denominator fallback for pre-templates clients. The
// done-for-you builds pick a theme for the trade as the first real design
// decision (Davemarly got Kasi Kitchen, Molotsi got Copperline), and that
// choice is most of the quality gap. This maps the same judgement onto the
// industry the member already told us at step 2.
//
// It preselects, it never restricts: every template stays pickable, and a
// member who changes it is not warned or blocked. The handoff's rule is
// that this mapping lives next to the registry rather than scattered
// through the wizard, so both halves (recommendation and photo-led) are
// here.

// Keyed on growth_clients.industry, which is always a subcategory string
// from INDUSTRY_TAXONOMY (e.g. "Plumbing") or the member's own free text
// when they picked "Other / Not Listed". Every subcategory in the taxonomy
// appears here on purpose: a missing one silently falls back to Classic,
// which is the behaviour this whole item exists to remove.
const BY_SUBCATEGORY: Record<string, TemplateId> = {
  // Beauty & Wellness — the work is visual, so the photo showcase leads.
  // Massage goes to Retreat instead: same unhurried temperature as a guest
  // house, not the same as a salon selling a look.
  "Hair Styling & Barbering": "left-split",
  "Nails & Makeup": "left-split",
  "Skincare & Esthetics": "left-split",
  "Massage & Bodywork": "retreat",
  "Fitness & Personal Training": "programme",
  "General Beauty & Wellness": "left-split",

  // Clothing & Fashion — mostly selling stock, so packages/products first.
  // Tailoring is the exception: one person, made to measure, personal.
  "Apparel & Streetwear": "multi-product",
  "Jewelry & Accessories": "multi-product",
  "Shoes & Footwear": "multi-product",
  "Tailoring & Alterations": "workroom",
  "Vintage & Thrift Reselling": "multi-product",
  "General Clothing & Fashion": "multi-product",

  // Food & Beverage — Kasi Kitchen throughout, per the handoff. The
  // member's own plate photos are the pitch in every one of these.
  "Baked Goods & Desserts": "kasi-kitchen",
  "Catering & Private Chef": "kasi-kitchen",
  "Meal Prep & Specialty Diets": "kasi-kitchen",
  "Food Trucks & Pop-up Stalls": "kasi-kitchen",
  "Homemade Sauces & Packaged Goods": "kasi-kitchen",
  "General Food & Beverage": "kasi-kitchen",

  // Skilled Trades — Copperline is the warmer neighbourhood-trade page
  // (WhatsApp-first, own job photos as the proof wall), Fieldwork is the
  // urgent contractor job sheet. Carpentry is a maker, not a call-out.
  Plumbing: "copperline",
  Electrical: "copperline",
  "Carpentry & Woodworking": "atelier",
  "Painting & Drywall": "fieldwork",
  "General Construction & Small Renovation": "fieldwork",
  "Appliance & HVAC Repair": "fieldwork",
  "General Trades & Repairs": "copperline",

  // Home, Garden & Care — work happens at the customer's place, so the
  // job-sheet shape fits. Childcare and pet care are the exceptions: the
  // customer is handing over something precious and wants to understand
  // how it runs before they enquire.
  "Residential Cleaning": "fieldwork",
  "Gardening & Landscaping": "fieldwork",
  "Interior Decor & Home Organizing": "left-split",
  "Moving, Hauling & Delivery": "fieldwork",
  "House Sitting & Property Maintenance": "fieldwork",
  "Babysitting & Childcare": "step-by-step",
  "Dog Walking & Pet Care": "step-by-step",
  "General Home & Care Services": "fieldwork",

  // Arts, Crafts & Makers — Workroom for the personal handmade maker,
  // Atelier for the workshop turning out commissioned pieces.
  "Handmade Jewelry & Crafts": "workroom",
  "Painting, Illustration & Prints": "workroom",
  "Pottery & Ceramics": "workroom",
  "Woodworking & Custom Furniture": "atelier",
  "Candles, Soaps & Wellness Products": "workroom",
  "General Arts & Crafts": "workroom",

  // Professional & Digital — App-Style Checklist suits a productised
  // service ("what's included"). Photography is gallery-led and browsed
  // for days before an enquiry, which is exactly Marquee's temperature.
  "Graphic Design & Branding": "left-split",
  "Social Media, Marketing & Copywriting": "app-dashboard",
  "Photography & Videography": "marquee",
  "Bookkeeping & Admin Support": "app-dashboard",
  "Business Consulting & Coaching": "programme",
  "General Digital Services": "app-dashboard",

  // Education & Lessons — Programme throughout, per the handoff: real
  // qualifications in the hero and each course as its own priced row.
  "Academic Tutoring": "programme",
  "Music & Arts Lessons": "programme",
  "Language Teaching": "programme",
  "Sports & Hobby Coaching": "programme",
  "General Education": "programme",

  // Automotive & Transport
  "Car Washing & Detailing": "fieldwork",
  "Ridesharing & Private Driving": "step-by-step",
  "Local Delivery & Courier Services": "step-by-step",
  "Mechanical Repairs": "fieldwork",
  "General Automotive": "fieldwork",

  // Events & Entertainment — Marquee throughout, per the handoff.
  "DJing & Live Music": "marquee",
  "Party Planning & Decorating": "marquee",
  "Event Photography & Video": "marquee",
  "Equipment Rental": "marquee",
  "General Events": "marquee",

  // Accommodation & Stays — Retreat throughout. This is the category the
  // theme was built for, and until 7 August 2026 nothing in the industry
  // list reached it.
  "Guest Houses & B&Bs": "retreat",
  "Lodges & Country Stays": "retreat",
  "Self-Catering & Holiday Homes": "retreat",
  "Backpackers & Hostels": "retreat",
  "General Accommodation": "retreat",
};

// Second pass for a member who typed their own industry under "Other /
// Not Listed". Ordered most specific first, since "wedding photographer"
// should match events before it matches nothing. Deliberately small: a
// wrong recommendation here costs a member one tap to change, so the bar
// is "obviously right", not "clever".
//
// Accommodation only appears here, never in BY_SUBCATEGORY, because
// INDUSTRY_TAXONOMY has no accommodation category at all — a guest house
// signing up today has to pick "Other" and type it. Flagged for Dewald;
// the Retreat theme exists and nothing in the picker leads to it.
const BY_KEYWORD: [RegExp, TemplateId][] = [
  [/guest ?house|b ?& ?b|bed and breakfast|lodge|self.?cater|accommodat|air ?bnb|chalet/i, "retreat"],
  // Deliberately ahead of the food rule below, which matches a bare
  // "kitchen": a cabinetmaker who types "kitchen cupboards" must not land
  // on the food theme, while a takeaway called "Mama's Kitchen" still
  // falls through to it. Caught by running the real strings, not by
  // reading the list.
  [/kitchen (cupboard|unit|fitting|cabinet)|cabinet|furniture|joiner|upholster|manufactur|workshop|fabricat|steel|signage/i, "atelier"],
  [/restaurant|takeaway|take.?away|kota|kitchen|bakery|baker|caterer|catering|food|braai|shisanyama|butcher|coffee|cafe/i, "kasi-kitchen"],
  [/plumb|geyser|drain|electric|solar/i, "copperline"],
  [/build|construct|renovat|paving|roofing|welding|tiling|handyman|pest|clean/i, "fieldwork"],
  [/wedding|event|part(y|ies)|decor hire|marquee|dj|catering hire|photograph|videograph/i, "marquee"],
  [/train|tutor|coach|lesson|academy|school|coursework|course|driving school/i, "programme"],
  [/sew|quilt|embroider|craft|handmade|pottery|ceramic|knit|candle|art class/i, "workroom"],
  [/salon|barber|hair|nail|beauty|spa|massage|lash|brow/i, "left-split"],
  [/shop|store|retail|boutique|reseller|stockist/i, "multi-product"],
];

// Category-level safety net: a subcategory added to INDUSTRY_TAXONOMY
// later, before anyone thinks to add it above, still lands somewhere
// deliberate rather than back on Classic.
const BY_CATEGORY: Record<string, TemplateId> = {
  "Beauty & Wellness": "left-split",
  "Clothing & Fashion": "multi-product",
  "Food & Beverage": "kasi-kitchen",
  "Skilled Trades & Repairs": "copperline",
  "Home, Garden & Care": "fieldwork",
  "Arts, Crafts & Makers": "workroom",
  "Professional & Digital Services": "app-dashboard",
  "Education & Lessons": "programme",
  "Automotive & Transport": "fieldwork",
  "Events & Entertainment": "marquee",
  "Accommodation & Stays": "retreat",
};

// Returns null when nothing matches confidently, which the picker reads as
// "show no badge and preselect nothing". A wrong-looking recommendation is
// worse than none: it makes the member distrust the rest of the wizard.
export function recommendedTemplateFor(industry: string | null | undefined): TemplateId | null {
  const value = (industry ?? "").trim();
  if (!value) return null;

  const exact = BY_SUBCATEGORY[value];
  if (exact) return exact;

  const category = INDUSTRY_TAXONOMY.find((c) => c.subcategories.includes(value));
  if (category) return BY_CATEGORY[category.name] ?? null;

  // Free text from "Other / Not Listed".
  for (const [pattern, templateId] of BY_KEYWORD) {
    if (pattern.test(value)) return templateId;
  }

  return null;
}

// Every hero variant that actually renders one of the member's photos.
// Taken from the hero components themselves (the eleven under
// src/components/landing/heroes/ that accept a photoUrl prop), not from a
// judgement call about which themes "feel" visual — so a member on a
// photo-led theme with no hero chosen is a real, checkable gap rather than
// an opinion.
const PHOTO_LED_HEROES = new Set<HeroVariant>([
  "split",
  "dark",
  "duo",
  "jobcard",
  "pipeline",
  "showreel",
  "retreat",
  "programme",
  "atelier",
  "workroom",
  "menuboard",
]);

// Classic Conversion (template === "conversion" or null) is not in the
// registry and does not use a hero photo, so it correctly returns false.
export function isPhotoLedTemplate(templateId: string | null | undefined): boolean {
  const template = templates.find((t) => t.id === templateId);
  return template ? PHOTO_LED_HEROES.has(template.hero) : false;
}
