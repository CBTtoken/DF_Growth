// Handoff 02 B: South African phone numbers, normalised once so every link
// built from them works.
//
// Members type the same number three different ways: "082 123 4567",
// "0821234567" and "+27 82 123 4567". Both `tel:` and `wa.me` fail silently on
// a malformed number, so a member never finds out their call button is dead.
// The live data already shows all three formats plus one number missing its
// leading digit entirely (refurb-online's WhatsApp is stored as 788763095
// against a call number of 27788763095, which produces a wa.me link to
// nobody).
//
// Canonical stored format is 27XXXXXXXXX: country code, no plus, no spaces.
// That is what 28 of the 34 live members already have, so this normalises the
// stragglers onto the majority rather than inventing a new format.

export type PhoneKind = "mobile" | "landline";

export type PhoneParseResult =
  | { ok: true; e164: string; national: string; kind: PhoneKind; display: string }
  | { ok: false; error: string };

// South African mobile prefixes, on the national number with the leading zero
// already stripped: 06x, 07x and 08x up to 085.
//
// 086 and 087 are deliberately excluded. 086 is share-call and 087 is VoIP;
// both are dialable and neither can receive WhatsApp, so treating them as
// mobile would hand a member a WhatsApp button that goes nowhere. They come
// back as landline, which is the honest answer for our purposes even though
// it is not literally true.
const MOBILE_PREFIX = /^(6\d|7\d|8[0-5])/;

export function normaliseSaPhone(input: string | null | undefined): PhoneParseResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a phone number." };

  // Keep digits only. A leading + is information we can rebuild from the
  // country code, and everything else is decoration the member typed.
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { ok: false, error: "That does not look like a phone number." };

  let national: string;
  if (digits.startsWith("27") && digits.length === 11) {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    // Someone dropped the leading zero, which is how refurb-online's WhatsApp
    // number ended up stored as 788763095. Nine digits with no zero and no
    // country code is unambiguous, so accept it rather than making the member
    // work out what is wrong.
    national = digits;
  } else if (digits.startsWith("0027") && digits.length === 13) {
    national = digits.slice(4);
  } else {
    return {
      ok: false,
      error: "That does not look like a South African number. Try 082 123 4567 or +27 82 123 4567.",
    };
  }

  if (national.length !== 9) {
    return { ok: false, error: "A South African number has 9 digits after the 0, for example 082 123 4567." };
  }

  const kind: PhoneKind = MOBILE_PREFIX.test(national) ? "mobile" : "landline";

  return {
    ok: true,
    e164: `27${national}`,
    national: `0${national}`,
    kind,
    display: formatSaPhone(`27${national}`),
  };
}

// "27821234567" reads as "082 123 4567". Handoff 02 A asks for the number as
// selectable text next to the buttons, because on a desktop a tel: link often
// does nothing useful and the visitor needs to be able to read and copy it.
export function formatSaPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const national = digits.startsWith("27") ? digits.slice(2) : digits.replace(/^0/, "");
  if (national.length !== 9) return e164;
  return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

// A stored number that predates validation may still be malformed. Every link
// builder below returns null rather than a broken href, so the caller renders
// nothing instead of a dead button. Handoff 02 B: "Never render a dead button."
export function telHref(phone: string | null | undefined): string | null {
  const parsed = normaliseSaPhone(phone);
  return parsed.ok ? `tel:+${parsed.e164}` : null;
}

export function whatsAppHref(phone: string | null | undefined, message?: string): string | null {
  const parsed = normaliseSaPhone(phone);
  if (!parsed.ok) return null;
  // A landline cannot receive WhatsApp. Better no button than a button that
  // opens a chat with a number that will never reply.
  if (parsed.kind === "landline") return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${parsed.e164}${query}`;
}
