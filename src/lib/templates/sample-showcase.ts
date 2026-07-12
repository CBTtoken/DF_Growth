import type { TemplateId } from "@/lib/templates/registry";

// Combined spec Sec 36: "See It In Action" needs pages that feel like real,
// distinct businesses, not the same template-picker business (Thabo's
// Plumbing, sample-data.ts) shown three times in different layouts. Three
// separate fictional businesses instead, one per template, each rendered at
// /sample/[slug] with a visible "this is a sample" banner — Growth has no
// real, permission-granted client pages yet (nothing has launched), and
// showing invented businesses as if they were real customers would be
// exactly the kind of fabricated social proof this codebase deliberately
// avoids elsewhere (see CompactHero's own comment on not inventing review
// counts). Clearly labeled samples are a different, honest thing.
//
// Same three templates the old TEMPLATE_SHOWCASE picked for pricing/page.tsx
// (dark-mode, vibrant-geo, storyteller) — chosen there for maximum visual
// contrast at a glance, that reasoning still holds here.
export type ShowcaseSample = {
  slug: string;
  templateId: TemplateId;
  businessName: string;
  tagline: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
  aboutText: string;
  additionalNotes: string;
  servicesText: string;
  businessAddress: string;
  industry: string;
  packages: { name: string; price: string; description: string }[];
  testimonials: { id: string; author_name: string; quote: string; rating: number }[];
};

export const SHOWCASE_SAMPLES: Record<string, ShowcaseSample> = {
  "fade-culture-barbershop": {
    slug: "fade-culture-barbershop",
    templateId: "dark-mode",
    businessName: "Fade Culture Barbershop",
    tagline: "Precision cuts, no rush, no shortcuts.",
    headline: "Sharp Fades, Every Single Time",
    subheadline: "Walk-ins welcome, but book ahead on weekends. We take our time so you leave looking right.",
    ctaLabel: "Book Your Cut",
    primaryColor: "#c9a227",
    secondaryColor: "#ffffff",
    aboutText:
      "Fade Culture opened in 2019 with two chairs and a reputation built entirely on word of mouth. Every barber here trained under the same standard: a fade isn't done until it's right, not until the clock says it's done.",
    additionalNotes:
      "Started in a garage, moved into our first real shop 18 months later. Still the same three barbers who opened the doors.",
    servicesText: "Skin Fades\nBeard Sculpting\nHot Towel Shaves\nKids Cuts",
    businessAddress: "77 Commissioner Street, Johannesburg",
    industry: "Barbershop",
    packages: [
      { name: "Signature Fade", price: "R180", description: "Full fade, line-up, and a hot towel finish." },
      { name: "Fade & Beard", price: "R280", description: "Signature fade plus a full beard sculpt." },
      { name: "The Full Service", price: "R380", description: "Fade, beard, hot towel shave, and a shoulder massage." },
    ],
    testimonials: [
      { id: "1", author_name: "Kagiso T.", quote: "Been coming here two years, never had a bad cut once.", rating: 5 },
      { id: "2", author_name: "Ryan P.", quote: "Worth the wait on Saturdays, every time.", rating: 5 },
    ],
  },
  "spice-route-cafe": {
    slug: "spice-route-cafe",
    templateId: "vibrant-geo",
    businessName: "Spice Route Café",
    tagline: "South African flavour, reimagined.",
    headline: "Where Cape Malay Meets Modern Brunch",
    subheadline: "Bobotie waffles, chai-spiced lattes, and a menu that changes with what's fresh at the market.",
    ctaLabel: "See Today's Menu",
    primaryColor: "#e0592a",
    secondaryColor: "#fff4e6",
    aboutText:
      "Spice Route started as a weekend market stall in Woodstock and grew into a full café once the queues got too long to ignore. Every dish still traces back to a family recipe, just plated a little differently.",
    additionalNotes:
      "Founded by two sisters who couldn't agree on which grandmother's recipes to use, so the menu has both.",
    servicesText: "All-Day Breakfast\nCatering for Events\nCoffee & Chai Bar\nTakeaway Platters",
    businessAddress: "14 Albert Road, Woodstock, Cape Town",
    industry: "Café",
    packages: [
      { name: "Brunch for Two", price: "R320", description: "Two mains, two drinks, one shared dessert." },
      { name: "Office Catering (10)", price: "From R1,800", description: "A full platter spread, delivered." },
      { name: "Private Event Catering", price: "Custom quote", description: "Full menu, staffed, for your own venue." },
    ],
    testimonials: [
      { id: "1", author_name: "Aaliyah N.", quote: "The bobotie waffles are unreal, I dream about them.", rating: 5 },
      { id: "2", author_name: "Chris B.", quote: "Catered our office party, everyone asked who did it.", rating: 5 },
    ],
  },
  "karoo-leatherworks": {
    slug: "karoo-leatherworks",
    templateId: "storyteller",
    businessName: "Karoo Leatherworks",
    tagline: "Handmade in the Karoo, built to outlast us.",
    headline: "Leather Goods Made to Be Passed Down",
    subheadline: "Every belt, bag, and wallet is cut, stitched, and finished by hand in a small Karoo workshop.",
    ctaLabel: "Shop the Collection",
    primaryColor: "#7a4a2b",
    secondaryColor: "#f5efe6",
    aboutText:
      "Karoo Leatherworks is a one-workshop operation in a small town most people drive straight through. Every piece is made from full-grain hide, sourced locally, and finished the same way it was when the workshop opened.",
    additionalNotes:
      "Started by a saddle-maker who wanted to make something that would outlive him. Now his daughter runs the workshop, same tools, same bench.",
    servicesText: "Custom Belts\nHandstitched Wallets\nLeather Bags\nRepairs & Restoration",
    businessAddress: "9 Church Street, Graaff-Reinet",
    industry: "Leather Goods",
    packages: [
      { name: "Classic Belt", price: "R650", description: "Full-grain hide, hand-stitched, your choice of buckle." },
      { name: "Everyday Wallet", price: "R480", description: "Slim, hand-stitched, ages beautifully with use." },
      { name: "Custom Commission", price: "From R1,200", description: "Your design, made to order, start to finish." },
    ],
    testimonials: [
      { id: "1", author_name: "Marli V.", quote: "Ordered a belt three years ago, still my favourite one.", rating: 5 },
      { id: "2", author_name: "Johan S.", quote: "You can feel the difference from a factory-made piece.", rating: 5 },
    ],
  },
};
