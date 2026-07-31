import {
  Wrench, Hammer, PaintRoller, Plug, Droplet, Flame, Home, Building2, Shield, Clock,
  Calendar, Phone, MapPin, Truck, Package, Scissors, Sparkles, Heart, Handshake, Users,
  GraduationCap, Briefcase, ChartNoAxesColumn, Leaf, Sun, Camera, Brush, PenLine, Star,
  Check, Award, Target, Lightbulb, Settings, Search, MessageCircle, ShoppingBag,
  CreditCard, KeyRound, PawPrint, Sprout, Recycle, Utensils, Bike, Music, BookOpen,
  Globe, Lock, type LucideIcon,
} from "lucide-react";
import { Playfair_Display, Bricolage_Grotesque, Fraunces, Outfit, Sora, Libre_Baskerville } from "next/font/google";
import type { PALETTE_KEYS, ICON_KEYS, TYPE_KEYS } from "./schema";

// The design tokens the generator chooses between.
//
// Closed sets that we designed, not values the model invents. A model choosing
// badly produces a page that suits the business poorly, which a human can
// review. A model inventing hex codes produces pages that fail contrast, which
// we would have to catch forever.

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

export type PaletteKey = (typeof PALETTE_KEYS)[number];

export type Palette = {
  surface: string;
  /** Alternating band. Deliberately a real tint, not a near-white. */
  surfaceAlt: string;
  /** The strong band, used once or twice a page for contrast. */
  surfaceDeep: string;
  ink: string;
  inkMuted: string;
  /** Text on surfaceDeep. */
  inkOnDeep: string;
  inkMutedOnDeep: string;
  accent: string;
  onAccent: string;
  card: string;
  border: string;
};

// Dewald, 2026-07-31: no full dark mode, ever. It does not suit this market.
// The old "night-premium" palette is gone rather than deprecated.
//
// What replaced it matters more than what went: every palette now has a real
// tinted `surfaceAlt` and a genuinely deep `surfaceDeep`. The previous set
// alternated white against near-white, which is why every page read as one
// undifferentiated column regardless of which palette was chosen. Buffelskop
// alternates #1C1410 against #F8F1E4, and that contrast is a large part of why
// it looks designed.
export const PALETTES: Record<PaletteKey, Palette> = {
  "slate-professional": {
    surface: "#ffffff", surfaceAlt: "#eef2f7", surfaceDeep: "#132033",
    ink: "#0f172a", inkMuted: "#475569", inkOnDeep: "#f1f5f9", inkMutedOnDeep: "#a8bacd",
    accent: "#1d4ed8", onAccent: "#ffffff", card: "#ffffff", border: "#dbe3ec",
  },
  "warm-earth": {
    surface: "#fdfaf6", surfaceAlt: "#f4e8d8", surfaceDeep: "#2c1f14",
    ink: "#2b2118", inkMuted: "#6b5847", inkOnDeep: "#f7ece0", inkMutedOnDeep: "#c4ae97",
    accent: "#a8571f", onAccent: "#ffffff", card: "#ffffff", border: "#e4d3bd",
  },
  "deep-forest": {
    surface: "#ffffff", surfaceAlt: "#e6efe8", surfaceDeep: "#14291d",
    ink: "#12241a", inkMuted: "#4a5f52", inkOnDeep: "#eef5f0", inkMutedOnDeep: "#a3bcaa",
    accent: "#166534", onAccent: "#ffffff", card: "#ffffff", border: "#cfe0d4",
  },
  "clean-clinical": {
    surface: "#ffffff", surfaceAlt: "#e8f1f6", surfaceDeep: "#0c2733",
    ink: "#0b1f2a", inkMuted: "#4a6472", inkOnDeep: "#eef6fa", inkMutedOnDeep: "#9db8c6",
    accent: "#0e7490", onAccent: "#ffffff", card: "#ffffff", border: "#d3e4ee",
  },
  "bold-industrial": {
    surface: "#ffffff", surfaceAlt: "#ebebed", surfaceDeep: "#1b1b1f",
    ink: "#18181b", inkMuted: "#52525b", inkOnDeep: "#f4f4f5", inkMutedOnDeep: "#a1a1aa",
    accent: "#b91c1c", onAccent: "#ffffff", card: "#ffffff", border: "#dcdce0",
  },
  "soft-craft": {
    surface: "#fffdfa", surfaceAlt: "#fbe9ed", surfaceDeep: "#331d25",
    ink: "#2a1a20", inkMuted: "#6d5058", inkOnDeep: "#faeef1", inkMutedOnDeep: "#c9a7b1",
    accent: "#9d2449", onAccent: "#ffffff", card: "#ffffff", border: "#eed3da",
  },
  "sun-coast": {
    surface: "#fffdf7", surfaceAlt: "#fdeecd", surfaceDeep: "#2e2410",
    ink: "#2a230f", inkMuted: "#6b5d3c", inkOnDeep: "#fbf3e0", inkMutedOnDeep: "#c9b98f",
    accent: "#b45309", onAccent: "#ffffff", card: "#ffffff", border: "#ecd9ac",
  },
  "ink-editorial": {
    surface: "#ffffff", surfaceAlt: "#f0eee9", surfaceDeep: "#1a1a18",
    ink: "#1a1a18", inkMuted: "#57544d", inkOnDeep: "#f5f4f0", inkMutedOnDeep: "#a8a49a",
    accent: "#7c2d12", onAccent: "#ffffff", card: "#ffffff", border: "#dedbd4",
  },
};

// ---------------------------------------------------------------------------
// Type pairings
// ---------------------------------------------------------------------------

// A heading font alone was not enough variety, and Dewald spotted it: two of
// the first three generated pages picked the same font while looking otherwise
// different. These are pairings, heading plus body, because what makes type
// feel designed is the relationship between the two, not either alone.
//
// next/font requires static module-scope calls. Only the chosen pairing's CSS
// variables are applied to the page, following the pattern anchors.ts
// established after a real LCP regression caused by preloading a font that was
// defined but never used.
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-gp-playfair" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-gp-bricolage" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-gp-fraunces" });
const outfit = Outfit({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-gp-outfit" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-gp-sora" });
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["700"], variable: "--font-gp-baskerville" });

export type TypeKey = (typeof TYPE_KEYS)[number];

export type TypePairing = {
  /** CSS variables to apply to the page root. */
  variable: string;
  /** Tailwind class for headings. */
  headingClass: string;
  /** Heading weight and tracking, so pairings differ in more than family. */
  headingTone: string;
  /** Eyebrow treatment, which carries a surprising amount of the character. */
  eyebrowClass: string;
};

export const TYPE_PAIRINGS: Record<TypeKey, TypePairing> = {
  "editorial-serif": {
    variable: playfair.variable,
    headingClass: "font-[family-name:var(--font-gp-playfair)]",
    headingTone: "font-semibold tracking-tight",
    eyebrowClass: "text-xs font-semibold uppercase tracking-[0.35em]",
  },
  "modern-display": {
    variable: bricolage.variable,
    headingClass: "font-[family-name:var(--font-gp-bricolage)]",
    headingTone: "font-extrabold tracking-tight",
    eyebrowClass: "text-xs font-bold uppercase tracking-[0.2em]",
  },
  "warm-serif": {
    variable: fraunces.variable,
    headingClass: "font-[family-name:var(--font-gp-fraunces)]",
    headingTone: "font-semibold tracking-tight",
    eyebrowClass: "text-xs font-semibold uppercase tracking-[0.3em]",
  },
  "clean-geometric": {
    variable: outfit.variable,
    headingClass: "font-[family-name:var(--font-gp-outfit)]",
    headingTone: "font-bold tracking-tight",
    eyebrowClass: "text-xs font-semibold uppercase tracking-[0.25em]",
  },
  "technical-sans": {
    variable: sora.variable,
    headingClass: "font-[family-name:var(--font-gp-sora)]",
    headingTone: "font-bold tracking-tight",
    eyebrowClass: "text-[0.7rem] font-bold uppercase tracking-[0.4em]",
  },
  "classic-book": {
    variable: baskerville.variable,
    headingClass: "font-[family-name:var(--font-gp-baskerville)]",
    headingTone: "font-bold tracking-tight",
    eyebrowClass: "text-xs font-semibold uppercase tracking-[0.3em]",
  },
};

// ---------------------------------------------------------------------------
// Rhythm
// ---------------------------------------------------------------------------

// Buffelskop breathes at py-24. The first version of this library sat at
// py-14, and cramped spacing reads as cheap however good the content is.
export const RHYTHM = {
  generous: { band: "py-20 sm:py-28", gap: "gap-12", heading: "text-4xl sm:text-5xl" },
  standard: { band: "py-16 sm:py-24", gap: "gap-10", heading: "text-3xl sm:text-4xl" },
  compact: { band: "py-12 sm:py-16", gap: "gap-8", heading: "text-3xl sm:text-4xl" },
} as const;

export type RhythmKey = keyof typeof RHYTHM;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export type IconKey = (typeof ICON_KEYS)[number];

// Meaning to component. The keys read as words rather than lucide export names
// because choosing "droplet" for a plumber is a judgement a model makes well,
// while guessing whether the export is `Droplet` or `Droplets` is not.
export const ICONS: Record<IconKey, LucideIcon> = {
  wrench: Wrench, hammer: Hammer, paintRoller: PaintRoller, plug: Plug, droplet: Droplet,
  flame: Flame, home: Home, building: Building2, shield: Shield, clock: Clock,
  calendar: Calendar, phone: Phone, mapPin: MapPin, truck: Truck, package: Package,
  scissors: Scissors, sparkles: Sparkles, heart: Heart, handshake: Handshake, users: Users,
  graduation: GraduationCap, briefcase: Briefcase, chart: ChartNoAxesColumn, leaf: Leaf,
  sun: Sun, camera: Camera, brush: Brush, pen: PenLine, star: Star, check: Check,
  award: Award, target: Target, lightbulb: Lightbulb, settings: Settings, search: Search,
  message: MessageCircle, shoppingBag: ShoppingBag, creditCard: CreditCard, key: KeyRound,
  paw: PawPrint, sprout: Sprout, recycle: Recycle, utensils: Utensils, bike: Bike,
  music: Music, book: BookOpen, globe: Globe, lock: Lock,
};

