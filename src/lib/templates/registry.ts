import type { LucideIcon } from "lucide-react";
import { Sparkles, Columns3, Grid3x3, BookOpen, Moon, Star, ListChecks, Shapes, ShoppingBag, MonitorSmartphone, Handshake, Wrench, Droplets, PartyPopper, Palmtree, GraduationCap, Hammer, Scissors } from "lucide-react";

// Every "section" a template can arrange, beyond the hero (always first)
// and the lead form (always last, since #lead-form is the CTA anchor every
// hero/section points at). Each maps 1:1 to an existing component in
// src/components/landing/ — this registry only controls hero choice and
// ordering, it never duplicates their data-fetching or empty-state logic
// (every one of them already renders nothing when its underlying field is
// empty, e.g. no packages typed in onboarding = no packages section).
export type SectionKey =
  | "story"
  | "about"
  | "services"
  | "packages"
  | "trust"
  | "gallery"
  | "location"
  | "howItWorks"
  | "reviews";

export type TemplateId =
  | "single-action"
  | "left-split"
  | "feature-grid"
  | "storyteller"
  | "dark-mode"
  | "social-proof"
  | "step-by-step"
  | "vibrant-geo"
  | "multi-product"
  | "app-dashboard"
  | "dual-offer"
  | "fieldwork"
  | "copperline"
  | "marquee"
  | "retreat"
  | "programme"
  | "atelier"
  | "workroom";

export type HeroVariant =
  | "default"
  | "minimal"
  | "split"
  | "editorial"
  | "dark"
  | "compact"
  | "geometric"
  | "checklist"
  | "bento"
  | "timeline"
  | "showcase"
  | "duo"
  | "jobcard"
  | "pipeline"
  | "showreel"
  | "retreat"
  | "programme"
  | "atelier"
  | "workroom";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  archetype: string;
  description: string;
  icon: LucideIcon;
  hero: HeroVariant;
  sections: SectionKey[];
  ctaHref?: string;
}

// "Classic Conversion" (template === null in growth_clients) isn't in this
// list — it's the original hand-built layout every existing client already
// has, kept as the unconditional default so nothing live changes for them.
export const templates: TemplateMeta[] = [
  {
    id: "single-action",
    name: "Single-Action Minimalist",
    archetype: "Centered · ultra-clean",
    description: "Massive headline, zero distractions, one high-converting CTA.",
    icon: Sparkles,
    hero: "minimal",
    // Rate & Review Sprint 2 fast-follow: Reviews was already rendering
    // unconditionally right before the lead form on every template,
    // including this one — folding it into the numbered-section system
    // preserves that existing position/behavior, it doesn't newly add
    // Reviews to a template that didn't have it before. Genuinely
    // reconsidering whether "zero distractions" should mean no reviews at
    // all here is a separate design call, out of scope for this fold-in.
    sections: ["reviews"],
  },
  {
    id: "left-split",
    name: "Left-Heavy Split",
    archetype: "50/50 split · media showcase",
    description: "Bold text locked left, a large photo showcase right.",
    icon: Columns3,
    hero: "split",
    sections: ["story", "about", "services", "packages", "trust", "gallery", "location", "reviews"],
  },
  {
    id: "feature-grid",
    name: "Content-Dense Feature Grid",
    archetype: "Multi-column · detailed",
    description: "Leads with your services and packages for businesses with a lot to offer.",
    icon: Grid3x3,
    hero: "bento",
    sections: ["services", "packages", "about", "story", "trust", "gallery", "location", "reviews"],
  },
  {
    id: "storyteller",
    name: "Storyteller Vertical",
    archetype: "Editorial · long-scroll",
    description: "A founder's-story feel, where your own words take centre stage.",
    icon: BookOpen,
    hero: "editorial",
    sections: ["story", "about", "services", "packages", "trust", "gallery", "location", "reviews"],
  },
  {
    id: "dark-mode",
    name: "High-Impact Dark Mode",
    archetype: "Dark · high-contrast accents",
    description: "Sleek premium dark hero with a glow in your own brand color.",
    icon: Moon,
    hero: "dark",
    sections: ["trust", "about", "services", "packages", "story", "gallery", "location", "reviews"],
  },
  {
    id: "social-proof",
    name: "Social Proof & Trust First",
    archetype: "Reviews-first",
    description: "Your testimonials land right below the hero, before anything else.",
    icon: Star,
    hero: "compact",
    sections: ["trust", "about", "services", "packages", "story", "gallery", "location", "reviews"],
  },
  {
    id: "step-by-step",
    name: "Interactive Step-by-Step",
    archetype: "How-it-works · form-forward",
    description: "A simple 3-step process up top, ending in a clear call to get in touch.",
    icon: ListChecks,
    hero: "timeline",
    sections: ["howItWorks", "about", "services", "packages", "trust", "gallery", "location", "reviews"],
  },
  {
    id: "vibrant-geo",
    name: "Bold & Vibrant Geometric",
    archetype: "Asymmetrical · playful",
    description: "Overlapping color blocks in your own brand colors, never a fixed palette.",
    icon: Shapes,
    hero: "geometric",
    sections: ["about", "story", "services", "packages", "trust", "gallery", "location", "reviews"],
  },
  {
    id: "multi-product",
    name: "Multi-Product Showcase",
    archetype: "Packages-first",
    description: "Your packages and pricing take the spotlight, right after the hero.",
    icon: ShoppingBag,
    hero: "showcase",
    sections: ["packages", "services", "about", "trust", "story", "gallery", "location", "reviews"],
    ctaHref: "#packages",
  },
  {
    id: "app-dashboard",
    name: "App-Style Checklist",
    archetype: "Browser-frame · checkmark grid",
    description: "A tidy \"what's included\" checklist framed like a product screenshot.",
    icon: MonitorSmartphone,
    hero: "checklist",
    sections: ["about", "story", "services", "packages", "trust", "gallery", "location", "reviews"],
  },
  // Built for the first done-for-you client build (WeCare Products), and
  // kept general because the shape recurs: a business that genuinely does
  // two separate things and loses half its visitors when a page pretends it
  // does one. A salon that sells product, a coach who runs workshops and
  // sells courses, a farm with a shop and a venue.
  //
  // The hero ends in two doors instead of one, and the second appears only
  // when the member actually has products, so a member who picks this
  // template without a shop still gets a finished page.
  {
    id: "dual-offer",
    name: "Two Sides of the Business",
    archetype: "Twin call-to-action · warm editorial",
    description:
      "For a business that does two things. The hero offers both, and the shop door appears once you have products.",
    icon: Handshake,
    hero: "duo",
    sections: ["about", "services", "story", "packages", "gallery", "trust", "location", "reviews"],
  },
  // Built for the second done-for-you client build (Jetting Worx), and kept
  // general because this shape recurs even more than dual-offer's: a trade
  // that works at the customer's premises on an urgent, physical problem —
  // pressure cleaning, drain jetting, plumbing, pest control, electrical,
  // rubble removal. The visitor usually has the problem *right now*, so the
  // page reads like a job sheet rather than a brochure: what we do, how a
  // call-out runs, then proof and coverage, with a phone number and WhatsApp
  // tappable inside the hero.
  //
  // The section order is deliberate lead-gen sequencing: the work itself
  // comes first (services), then how a job runs (howItWorks), and only then
  // the "about us" a brochure would have led with.
  {
    id: "fieldwork",
    name: "Fieldwork",
    archetype: "Industrial · job-sheet utility",
    description:
      "For trades that work on site. Reads like a serious contractor's job sheet: the work first, then how a call-out runs.",
    icon: Wrench,
    hero: "jobcard",
    sections: ["services", "howItWorks", "about", "gallery", "story", "packages", "trust", "location", "reviews"],
  },
  // Built for the third done-for-you client build (Molotsi Plumbers,
  // Ficksburg) and the informal-market thesis behind it: the visitor is a
  // neighbour on a phone, WhatsApp is how business actually starts, and the
  // proof that matters is the member's own photos of real jobs. Where
  // Fieldwork reads like an urgent contractor's job sheet, Copperline is
  // the warmer neighbourhood-trades page: the copper line motif (the
  // trade's own material) threads the hero, the services render as
  // junctions along a pipe run, and the gallery is a wall of printed
  // photos rather than an evidence file.
  //
  // Section order is proof-led on purpose: what we do, then the photo wall
  // (this market's strongest trust signal), then who we are.
  {
    id: "copperline",
    name: "Copperline",
    archetype: "Warm trade · copper and navy",
    description:
      "For neighbourhood trades. WhatsApp-first, the member's own job photos as the proof wall, and a copper line running the page.",
    icon: Droplets,
    hero: "pipeline",
    sections: ["services", "gallery", "about", "howItWorks", "story", "packages", "trust", "location", "reviews"],
  },
  // Built for the fourth done-for-you client build (SIP Happens Bespoke
  // Mobile Bar) and the platform's first considered-purchase archetype.
  // Fieldwork and Copperline serve a visitor with a problem right now who
  // wants a number in four seconds; an events customer is the opposite
  // temperature — they browse, compare and look at pictures for days
  // before they enquire. So the page is gallery-led with room to look:
  // photos first, then the offer as comparable concept cards (packages),
  // then what is included, and only then the people. The primary action is
  // an enquiry, never an emergency call, though tappable WhatsApp and
  // phone still sit quietly in the hero per the Build Kit rule for
  // done-for-you builds.
  {
    id: "marquee",
    name: "Marquee",
    archetype: "Events · gallery-led · considered purchase",
    description:
      "For events and occasion businesses. Photos lead, packages invite comparison, and the page asks for an enquiry rather than a call-out.",
    icon: PartyPopper,
    hero: "showreel",
    // No location section: an events business works at the customer's
    // venue, so a map to nowhere would only pad the page. Areas served
    // render in the hero's own strip in plain words instead. No
    // howItWorks either, after Dewald's live review of the first build
    // ("it scrolls forever"): the generic three-step filler added a
    // screen of scroll without saying anything the enquiry form's own
    // questions do not, and on a browsing page every screen has to earn
    // its place.
    sections: ["gallery", "packages", "services", "about", "story", "trust", "reviews"],
  },
  // Built for the fifth done-for-you client build (The Falling Feather
  // Inn, Val-de-Grace, Pretoria East) and kept general because the shape
  // recurs for any stay-and-relax business: guest houses, B&Bs, lodges,
  // self-catering. A visitor here isn't fixing an urgent problem or
  // comparing considered-purchase options, they're deciding whether this
  // is a nice place to be — so the hero leads with the place itself (a
  // real photo, not brand color alone) and the facilities read as a quiet
  // at-a-glance strip rather than a services list or a job sheet.
  {
    id: "retreat",
    name: "Retreat",
    archetype: "Hospitality · photo-led, unhurried",
    description:
      "For guest houses, B&Bs and lodges. The property itself fills the hero, facilities read at a glance, and the whole page takes its time.",
    icon: Palmtree,
    hero: "retreat",
    sections: ["about", "services", "gallery", "story", "packages", "trust", "location", "reviews"],
  },
  // Built for the sixth done-for-you client build (Cape Town Butler,
  // hospitality skills training) and kept general for any credentialed
  // training or coaching business: no testimonials are allowed anywhere on
  // Growth, so a page like this has to carry its own trust a different
  // way — real, stated qualifications up front, and its programmes read
  // as a proper course list with prices, not a paragraph of prose.
  {
    id: "programme",
    name: "Programme",
    archetype: "Training · credentials-first",
    description:
      "For training, coaching and skills-based services. Real qualifications sit in the hero, and each course or programme lists as its own priced row.",
    icon: GraduationCap,
    hero: "programme",
    sections: ["about", "packages", "services", "gallery", "story", "trust", "location", "reviews"],
  },
  // Built for the seventh done-for-you client build (Greeff Kitchens,
  // Klerksdorp, custom kitchens since 1991) and kept general for any
  // bespoke manufacturer or workshop trading on real years and a body of
  // finished work: cabinetmakers, upholsterers, furniture makers, custom
  // fabricators. A kitchen is a considered purchase, not an emergency, so
  // this shares Marquee's unhurried, browse-first temperature, but the
  // trust signal is heritage (a founding year, a founder's own pitch)
  // rather than photography-as-product.
  {
    id: "atelier",
    name: "Atelier",
    archetype: "Craft workshop · heritage, considered purchase",
    description:
      "For bespoke manufacturers and workshops with real years behind them. A founding-year badge in the hero, the founder's own pitch beside a work photo, and a browsable gallery of finished work.",
    icon: Hammer,
    hero: "atelier",
    sections: ["about", "gallery", "services", "story", "packages", "trust", "location", "reviews"],
  },
  // Built for the eighth done-for-you client build (Cottonball, Moreleta
  // Park, sewing/embroidery/quilting agency and classes) and kept general
  // for any personal craft or hobby business run by one person the
  // customer gets to know: sewing and craft shops, pottery studios, art
  // classes, small home-based makers. The register is deliberately the
  // opposite of Atelier's heritage-manufacturer tone: this is small,
  // handmade and personal, so the gallery is a pinned-up wall of real work
  // rather than a lookbook, and the card recipe carries a stitched top
  // seam as this theme's own material signature.
  {
    id: "workroom",
    name: "Workroom",
    archetype: "Craft & classes · handmade, personal",
    description:
      "For a personal craft shop or class business run by one person. Warm and small-scale, with a pinned-up wall of the member's own work.",
    icon: Scissors,
    hero: "workroom",
    sections: ["about", "gallery", "services", "packages", "story", "trust", "location", "reviews"],
  },
];

export function getTemplate(id: string | null): TemplateMeta | null {
  return templates.find((t) => t.id === id) ?? null;
}
