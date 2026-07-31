import {
  Wrench, Hammer, PaintRoller, Plug, Droplet, Flame, Home, Building2, Shield, Clock,
  Calendar, Phone, MapPin, Truck, Package, Scissors, Sparkles, Heart, Handshake, Users,
  GraduationCap, Briefcase, ChartNoAxesColumn, Leaf, Sun, Camera, Brush, PenLine, Star,
  Check, Award, Target, Lightbulb, Settings, Search, MessageCircle, ShoppingBag,
  CreditCard, KeyRound, type LucideIcon,
} from "lucide-react";
import type { PALETTE_KEYS, ICON_KEYS } from "./schema";

// The design tokens the generator is allowed to choose between.
//
// Deliberately a closed set that we designed rather than values the model
// invents. A model picking badly then produces a page that suits the business
// poorly, which is a judgement call we can review. A model inventing hex codes
// produces pages that fail contrast and are unreadable, which is a defect we
// would have to catch on every single generation forever.

export type PaletteKey = (typeof PALETTE_KEYS)[number];

export type Palette = {
  /** Page background. */
  surface: string;
  /** Alternating band background, so consecutive sections separate without borders. */
  surfaceAlt: string;
  /** Body and heading text on `surface`. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Accent for eyebrows, icons and rules. Overridden by the member's own brand colour where they have one. */
  accent: string;
  /** Text that sits on `accent` as a background. */
  onAccent: string;
  /** Card background. */
  card: string;
  /** Hairline borders. */
  border: string;
};

// Each of these is a full surface system checked so body text clears 4.5:1 on
// both surfaces and heading text clears it on cards.
export const PALETTES: Record<PaletteKey, Palette> = {
  "slate-professional": {
    surface: "#ffffff", surfaceAlt: "#f6f8fa", ink: "#0f172a", inkMuted: "#475569",
    accent: "#1d4ed8", onAccent: "#ffffff", card: "#ffffff", border: "#e2e8f0",
  },
  "warm-earth": {
    surface: "#fdfaf6", surfaceAlt: "#f5ede2", ink: "#2b2118", inkMuted: "#6b5847",
    accent: "#a8571f", onAccent: "#ffffff", card: "#ffffff", border: "#e7d9c8",
  },
  "deep-forest": {
    surface: "#ffffff", surfaceAlt: "#f0f5f1", ink: "#12241a", inkMuted: "#4a5f52",
    accent: "#166534", onAccent: "#ffffff", card: "#ffffff", border: "#d5e3d8",
  },
  "clean-clinical": {
    surface: "#ffffff", surfaceAlt: "#f2f7fa", ink: "#0b1f2a", inkMuted: "#4a6472",
    accent: "#0e7490", onAccent: "#ffffff", card: "#ffffff", border: "#dbe7ee",
  },
  "bold-industrial": {
    surface: "#ffffff", surfaceAlt: "#f4f4f5", ink: "#18181b", inkMuted: "#52525b",
    accent: "#b91c1c", onAccent: "#ffffff", card: "#ffffff", border: "#e4e4e7",
  },
  "soft-craft": {
    surface: "#fffdfa", surfaceAlt: "#fdf2f4", ink: "#2a1a20", inkMuted: "#6d5058",
    accent: "#9d2449", onAccent: "#ffffff", card: "#ffffff", border: "#f0dde2",
  },
  "night-premium": {
    surface: "#0b0f14", surfaceAlt: "#131a22", ink: "#f3f6f9", inkMuted: "#9aacbd",
    accent: "#38bdf8", onAccent: "#04121c", card: "#151d26", border: "#25303c",
  },
};

export function isDarkPalette(key: PaletteKey): boolean {
  return key === "night-premium";
}

export type IconKey = (typeof ICON_KEYS)[number];

// Meaning to component. The model chooses by meaning, which is why the keys
// read as words rather than as lucide export names: asking for "droplet" for a
// plumber is a judgement it can make well, guessing whether the export is
// `Droplet` or `Droplets` is not.
export const ICONS: Record<IconKey, LucideIcon> = {
  wrench: Wrench, hammer: Hammer, paintRoller: PaintRoller, plug: Plug, droplet: Droplet,
  flame: Flame, home: Home, building: Building2, shield: Shield, clock: Clock,
  calendar: Calendar, phone: Phone, mapPin: MapPin, truck: Truck, package: Package,
  scissors: Scissors, sparkles: Sparkles, heart: Heart, handshake: Handshake, users: Users,
  graduation: GraduationCap, briefcase: Briefcase, chart: ChartNoAxesColumn, leaf: Leaf,
  sun: Sun, camera: Camera, brush: Brush, pen: PenLine, star: Star, check: Check,
  award: Award, target: Target, lightbulb: Lightbulb, settings: Settings, search: Search,
  message: MessageCircle, shoppingBag: ShoppingBag, creditCard: CreditCard, key: KeyRound,
};
