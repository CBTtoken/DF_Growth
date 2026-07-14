// Public Beta Polish Sprint Sec 6: the fixed category/subcategory matrix,
// shared verbatim by the web onboarding step (Step2BusinessProfile.tsx) and
// the WhatsApp conversation flow (lib/whatsapp/conversation.ts) so the two
// entry channels can never drift into offering different lists. The stored
// growth_clients.industry value is always a subcategory string (e.g.
// "Plumbing"), or the client's own free text when they pick
// OTHER_INDUSTRY — no schema/column change needed, industry was already a
// plain text field.
export type IndustryCategory = {
  name: string;
  subcategories: string[];
};

export const OTHER_INDUSTRY = "Other / Not Listed";

export const INDUSTRY_TAXONOMY: IndustryCategory[] = [
  {
    name: "Beauty & Wellness",
    subcategories: [
      "Hair Styling & Barbering",
      "Nails & Makeup",
      "Skincare & Esthetics",
      "Massage & Bodywork",
      "Fitness & Personal Training",
      "General Beauty & Wellness",
    ],
  },
  {
    name: "Clothing & Fashion",
    subcategories: [
      "Apparel & Streetwear",
      "Jewelry & Accessories",
      "Shoes & Footwear",
      "Tailoring & Alterations",
      "Vintage & Thrift Reselling",
      "General Clothing & Fashion",
    ],
  },
  {
    name: "Food & Beverage",
    subcategories: [
      "Baked Goods & Desserts",
      "Catering & Private Chef",
      "Meal Prep & Specialty Diets",
      "Food Trucks & Pop-up Stalls",
      "Homemade Sauces & Packaged Goods",
      "General Food & Beverage",
    ],
  },
  {
    name: "Skilled Trades & Repairs",
    subcategories: [
      "Plumbing",
      "Electrical",
      "Carpentry & Woodworking",
      "Painting & Drywall",
      "General Construction & Small Renovation",
      "Appliance & HVAC Repair",
      "General Trades & Repairs",
    ],
  },
  {
    name: "Home, Garden & Care",
    subcategories: [
      "Residential Cleaning",
      "Gardening & Landscaping",
      "Interior Decor & Home Organizing",
      "Moving, Hauling & Delivery",
      "House Sitting & Property Maintenance",
      "Babysitting & Childcare",
      "Dog Walking & Pet Care",
      "General Home & Care Services",
    ],
  },
  {
    name: "Arts, Crafts & Makers",
    subcategories: [
      "Handmade Jewelry & Crafts",
      "Painting, Illustration & Prints",
      "Pottery & Ceramics",
      "Woodworking & Custom Furniture",
      "Candles, Soaps & Wellness Products",
      "General Arts & Crafts",
    ],
  },
  {
    name: "Professional & Digital Services",
    subcategories: [
      "Graphic Design & Branding",
      "Social Media, Marketing & Copywriting",
      "Photography & Videography",
      "Bookkeeping & Admin Support",
      "Business Consulting & Coaching",
      "General Digital Services",
    ],
  },
  {
    name: "Education & Lessons",
    subcategories: [
      "Academic Tutoring",
      "Music & Arts Lessons",
      "Language Teaching",
      "Sports & Hobby Coaching",
      "General Education",
    ],
  },
  {
    name: "Automotive & Transport",
    subcategories: [
      "Car Washing & Detailing",
      "Ridesharing & Private Driving",
      "Local Delivery & Courier Services",
      "Mechanical Repairs",
      "General Automotive",
    ],
  },
  {
    name: "Events & Entertainment",
    subcategories: [
      "DJing & Live Music",
      "Party Planning & Decorating",
      "Event Photography & Video",
      "Equipment Rental",
      "General Events",
    ],
  },
];

export const ALL_INDUSTRY_SUBCATEGORIES = INDUSTRY_TAXONOMY.flatMap((c) => c.subcategories);

// Reverse lookup used to pre-fill the category/subcategory pickers from an
// already-stored value — covers both a resumed onboarding session and an
// existing client's free-text industry value from before this taxonomy
// existed (falls back to "Other" with their original text intact).
export function resolveIndustryValue(value: string): { category: string; subcategory: string; otherText: string } {
  const category = INDUSTRY_TAXONOMY.find((c) => c.subcategories.includes(value));
  if (category) return { category: category.name, subcategory: value, otherText: "" };
  if (!value) return { category: "", subcategory: "", otherText: "" };
  return { category: OTHER_INDUSTRY, subcategory: "", otherText: value };
}
