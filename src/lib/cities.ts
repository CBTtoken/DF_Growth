// Marketplace directory: a curated list of major South African cities and
// towns, not an exhaustive gazetteer — same tradeoff as INDUSTRY_TAXONOMY
// (src/lib/industries.ts), a genuinely complete list of every SA town would
// be hundreds of entries long and unusable as a dropdown. Covers every
// province's main metro(s) plus well-known secondary towns. OTHER_CITY is
// the escape hatch for anything not listed, matching the industry
// taxonomy's own "Other / Not Listed" pattern — stored as free text via a
// paired text input rather than silently dropped.
export const OTHER_CITY = "Other / Not Listed";

export const CITIES: string[] = [
  // Gauteng
  "Johannesburg",
  "Pretoria",
  "Sandton",
  "Centurion",
  "Randburg",
  "Roodepoort",
  "Soweto",
  "Benoni",
  "Boksburg",
  "Kempton Park",
  "Germiston",
  "Vanderbijlpark",
  "Vereeniging",
  "Krugersdorp",
  "Midrand",
  // Western Cape
  "Cape Town",
  "Stellenbosch",
  "Paarl",
  "Somerset West",
  "Strand",
  "George",
  "Wilderness",
  "Worcester",
  "Knysna",
  "Plettenberg Bay",
  "Mossel Bay",
  "Oudtshoorn",
  "Hermanus",
  "Bredasdorp",
  // KwaZulu-Natal
  "Durban",
  "Pietermaritzburg",
  "Richards Bay",
  "Newcastle",
  "Ladysmith",
  "Umhlanga",
  // Eastern Cape
  "Gqeberha (Port Elizabeth)",
  "East London",
  "Mthatha",
  "Grahamstown (Makhanda)",
  "Queenstown",
  // Free State
  "Bloemfontein",
  "Welkom",
  "Bethlehem",
  // Mpumalanga
  "Mbombela (Nelspruit)",
  "Witbank (eMalahleni)",
  "Middelburg",
  // Limpopo
  "Polokwane",
  "Tzaneen",
  "Thohoyandou",
  // North West
  "Rustenburg",
  "Potchefstroom",
  "Klerksdorp",
  "Mahikeng",
  // Northern Cape
  "Kimberley",
  "Upington",
  "Springbok",
  OTHER_CITY,
];
