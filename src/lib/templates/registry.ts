import type { LucideIcon } from "lucide-react";
import { Sparkles, Columns3, Grid3x3, BookOpen, Moon, Star, ListChecks, Shapes, ShoppingBag, MonitorSmartphone } from "lucide-react";

// Every "section" a template can arrange, beyond the hero (always first)
// and the lead form (always last, since #lead-form is the CTA anchor every
// hero/section points at). Each maps 1:1 to an existing component in
// src/components/landing/ — this registry only controls hero choice and
// ordering, it never duplicates their data-fetching or empty-state logic
// (every one of them already renders nothing when its underlying field is
// empty, e.g. no packages typed in onboarding = no packages section).
export type SectionKey = "story" | "about" | "services" | "packages" | "trust" | "location" | "howItWorks";

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
  | "app-dashboard";

export type HeroVariant = "default" | "minimal" | "split" | "editorial" | "dark" | "compact" | "geometric" | "checklist";

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
    sections: [],
  },
  {
    id: "left-split",
    name: "Left-Heavy Split",
    archetype: "50/50 split · media showcase",
    description: "Bold text locked left, a large photo showcase right.",
    icon: Columns3,
    hero: "split",
    sections: ["story", "about", "services", "packages", "trust", "location"],
  },
  {
    id: "feature-grid",
    name: "Content-Dense Feature Grid",
    archetype: "Multi-column · detailed",
    description: "Leads with your services and packages for businesses with a lot to offer.",
    icon: Grid3x3,
    hero: "default",
    sections: ["services", "packages", "about", "story", "trust", "location"],
  },
  {
    id: "storyteller",
    name: "Storyteller Vertical",
    archetype: "Editorial · long-scroll",
    description: "A founder's-story feel — your own words take center stage.",
    icon: BookOpen,
    hero: "editorial",
    sections: ["story", "about", "services", "packages", "trust", "location"],
  },
  {
    id: "dark-mode",
    name: "High-Impact Dark Mode",
    archetype: "Dark · high-contrast accents",
    description: "Sleek premium dark hero with a glow in your own brand color.",
    icon: Moon,
    hero: "dark",
    sections: ["about", "story", "services", "packages", "trust", "location"],
  },
  {
    id: "social-proof",
    name: "Social Proof & Trust First",
    archetype: "Reviews-first",
    description: "Your testimonials land right below the hero, before anything else.",
    icon: Star,
    hero: "compact",
    sections: ["trust", "about", "services", "packages", "story", "location"],
  },
  {
    id: "step-by-step",
    name: "Interactive Step-by-Step",
    archetype: "How-it-works · form-forward",
    description: "A simple 3-step process up top, ending in a clear call to get in touch.",
    icon: ListChecks,
    hero: "default",
    sections: ["howItWorks", "about", "services", "packages", "trust", "location"],
  },
  {
    id: "vibrant-geo",
    name: "Bold & Vibrant Geometric",
    archetype: "Asymmetrical · playful",
    description: "Overlapping color blocks in your own brand colors, never a fixed palette.",
    icon: Shapes,
    hero: "geometric",
    sections: ["about", "story", "services", "packages", "trust", "location"],
  },
  {
    id: "multi-product",
    name: "Multi-Product Showcase",
    archetype: "Packages-first",
    description: "Your packages and pricing take the spotlight, right after the hero.",
    icon: ShoppingBag,
    hero: "default",
    sections: ["packages", "services", "about", "trust", "story", "location"],
    ctaHref: "#packages",
  },
  {
    id: "app-dashboard",
    name: "App-Style Checklist",
    archetype: "Browser-frame · checkmark grid",
    description: "A tidy \"what's included\" checklist framed like a product screenshot.",
    icon: MonitorSmartphone,
    hero: "checklist",
    sections: ["about", "story", "services", "packages", "trust", "location"],
  },
];

export function getTemplate(id: string | null): TemplateMeta | null {
  return templates.find((t) => t.id === id) ?? null;
}
