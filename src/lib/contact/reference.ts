// Handoff 02 A: the reference code, and the message a customer sends.
//
// "It must name DigitalFlyer so the member can see where the enquiry came
// from, and carry a short reference code for that member so enquiries can be
// matched to the page later. Do not make the customer feel they are sending a
// form."

// Derived from the member's id rather than stored, so there is no column to
// add, no backfill, no collision handling, and no way for a member's code to
// drift from their record. Four characters from an alphabet with no 0/O and no
// 1/I, because these get read aloud over a phone.
//
// Four characters of a 32-symbol alphabet is about a million combinations
// against 34 members. Collisions are not a concern: this is a label a member
// reads on a WhatsApp message, not a key anything looks up.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function referenceCode(growthClientId: string): string {
  // FNV-1a. Small, stable across Node and the browser, and does not pull in a
  // crypto import for what is a display label.
  let hash = 0x811c9dc5;
  for (let i = 0; i < growthClientId.length; i++) {
    hash ^= growthClientId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[hash % ALPHABET.length];
    hash = Math.floor(hash / ALPHABET.length);
  }
  return `DF-${code}`;
}

// House style: plain language, no jargon, no em dashes, "Good day" rather than
// "Hi there".
//
// Written to be deleted. The customer opens WhatsApp with this already in the
// box and most will type over it or add to it, which is the point: a message
// they cannot easily change feels like a form, and Handoff 02 A is explicit
// that it must not. Everything the member needs (that it came from their
// DigitalFlyer page, and which page) is in the first line, so it survives even
// when the customer replaces the second.
export function whatsAppMessage({
  businessName,
  growthClientId,
}: {
  businessName: string;
  growthClientId: string;
}): string {
  return `Good day ${businessName}, I found you on DigitalFlyer (${referenceCode(growthClientId)}).`;
}
