// Friendly display names for the 40 OFO sub-major groups, approved by
// Dewald 7 August 2026 (with his seven corrections: 13, 24, 31, 34, 41,
// 85, 86). Display only: the official OFO titles stay in the database and
// stay authoritative; this mapping exists because "Building and Related
// Trades Workers" is not how a bricklayer describes their work.
//
// One convention throughout: plain names, no colon-plus-examples. The two
// entries that had examples ("Building trades: bricklayers, plumbers,
// painters") were the only two of forty, and measured at 375px the longest
// example form sat wider than the select control while "Building trades"
// is unmistakable on its own.

const OFO_GROUP_DISPLAY_NAMES: Record<string, string> = {
  "11": "Directors and senior officials",
  "12": "Business and office managers",
  "13": "Production, services and site managers",
  "14": "Shop, restaurant and guesthouse managers",
  "21": "Engineers and scientists",
  "22": "Doctors, nurses and health professionals",
  "23": "Teachers and lecturers",
  "24": "Accounting, HR and business professionals",
  "25": "IT and software",
  "26": "Legal, social and creative professionals",
  "31": "Engineering and science technicians",
  "32": "Health assistants and technicians",
  "33": "Bookkeepers and office professionals",
  "34": "Legal, community, sport and creative",
  "35": "IT support and technicians",
  "41": "Office admin and data capture",
  "42": "Call centre and front desk",
  "43": "Stock, invoicing and payroll clerks",
  "44": "Filing and general office work",
  "51": "Hospitality and personal services",
  "52": "Shop and sales work",
  "53": "Care workers and childminders",
  "54": "Security and protection",
  "61": "Farming",
  "62": "Forestry and fishing",
  "63": "Small-scale farming and fishing",
  "64": "Building trades",
  "65": "Metal trades",
  "66": "Sewing, crafts and printing",
  "67": "Electricians and electronics",
  "68": "Bakers, butchers, carpenters and tailors",
  "71": "Machine and plant operators",
  "72": "Assembly and production line",
  "73": "Drivers and forklift operators",
  "81": "Cleaning and domestic work",
  "82": "Farm work",
  "83": "General labour and construction work",
  "84": "Kitchen staff",
  "85": "Street vending and hawking",
  "86": "Refuse and garden work",
};

/**
 * The name a person sees for a sub-major group. Falls back to the official
 * title so a future OFO version's new group is never invisible while its
 * friendly name waits for approval.
 */
export function ofoGroupDisplayName(code: string, officialLabel: string): string {
  return OFO_GROUP_DISPLAY_NAMES[code] ?? officialLabel;
}
