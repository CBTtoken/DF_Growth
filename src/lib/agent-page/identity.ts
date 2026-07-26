// Small shared bits of an agent's identity, used by the page, the monogram
// badge and the OG image route alike.

// "Losaan Vd Westhuizen Meiring" -> "LM". First and last word rather than
// the first two letters, so a multi-part Afrikaans surname reads as
// initials rather than as "LV". A single-word name gives a single letter,
// which the badge lays out fine.
export function agentInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

// Sec 1.3 sets the name "very large and stacked". Splitting on the first
// word keeps the given name on its own line at display size and lets the
// rest of the name run underneath, which holds up for both "Natasha
// Rosema" and "Losaan Vd Westhuizen Meiring" without a per-agent override.
export function stackedName(fullName: string): { first: string; rest: string | null } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { first: fullName.trim(), rest: null };
  return { first: words[0], rest: words.slice(1).join(" ") };
}

// South African cell numbers are entered locally ("082 123 4567") but
// wa.me needs the full international number with no leading zero. Same
// normalisation LeadForm.tsx already does for a client page's own number.
// Returns null when there is nothing dialable, which is a real case: an
// agent record can carry "Not provided" in this field, and a WhatsApp
// button that opens a broken chat is worse than no button.
export function agentWhatsAppLink(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

// "Active since July 2026" for the credential strip.
export function activeSinceLabel(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}
