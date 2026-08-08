import {
  Accessibility,
  AirVent,
  Baby,
  Bath,
  BatteryCharging,
  Bed,
  Briefcase,
  Car,
  Check,
  CigaretteOff,
  Coffee,
  Croissant,
  Dog,
  Fan,
  Flame,
  KeyRound,
  Lock,
  type LucideIcon,
  Plane,
  Refrigerator as Fridge,
  ShieldCheck,
  ShowerHead,
  Sofa,
  Sprout,
  Trees,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";
import { labelAmenities } from "@/lib/stays/amenities";

// Amenities as icons, not as a list of words.
//
// A guest scanning a page on a phone reads a row of icons in about a second
// and a bulleted list of sixteen phrases not at all. Every icon carries its
// label next to it anyway, because an icon on its own is a guessing game
// and the interface standard is explicit that a label needing explanation
// is the wrong label.

const ICONS: Record<string, LucideIcon> = {
  // Property
  wifi: Wifi,
  parking: Car,
  secure_parking: ShieldCheck,
  breakfast: Croissant,
  pool: Waves,
  garden: Trees,
  braai: Flame,
  shared_kitchen: UtensilsCrossed,
  shared_lounge: Sofa,
  outdoor_dining: UtensilsCrossed,
  laundry: WashingMachine,
  pet_friendly: Dog,
  family_friendly: Baby,
  non_smoking: CigaretteOff,
  wheelchair_access: Accessibility,
  airport_shuttle: Plane,
  backup_power: BatteryCharging,
  self_check_in: KeyRound,
  // Room
  ensuite: Bath,
  shared_bathroom: ShowerHead,
  bath: Bath,
  shower: ShowerHead,
  aircon: AirVent,
  fan: Fan,
  heater: Wind,
  kitchenette: UtensilsCrossed,
  fridge: Fridge,
  tea_coffee: Coffee,
  tv: Tv,
  desk: Briefcase,
  safe: Lock,
  private_entrance: KeyRound,
  patio: Sprout,
  sleeper_couch: Bed,
};

// Only ever reached by an amenity added to the lists in
// src/lib/stays/amenities.ts without an icon here. A tick beats a missing
// icon, and beats guessing at a wrong one.
const FALLBACK = Check;

export function AmenityRow({
  slugs,
  level,
  accentColor,
  className = "",
}: {
  slugs: string[];
  level: "property" | "room";
  accentColor?: string;
  className?: string;
}) {
  const amenities = labelAmenities(slugs, level);
  if (amenities.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2.5 ${className}`}>
      {amenities.map((amenity) => {
        const Icon = ICONS[amenity.slug] ?? FALLBACK;
        return (
          <li key={amenity.slug} className="flex items-center gap-2 text-sm text-gray-700">
            <Icon aria-hidden className="h-4 w-4 shrink-0" style={accentColor ? { color: accentColor } : undefined} />
            <span>{amenity.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The same list as plain words, for an email or a tight card. */
export function amenityWords(slugs: string[], level: "property" | "room"): string {
  return labelAmenities(slugs, level)
    .map((a) => a.label)
    .join(" · ");
}
