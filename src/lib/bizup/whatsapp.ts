// Turning a South African phone number into the form wa.me expects.
//
// Extracted from send-actions.ts when payment reminders needed the same
// conversion. Two implementations of a phone number format is exactly the
// kind of thing that drifts, and the failure mode is a message sent to the
// wrong person.

/**
 * A local 082... number becomes 2782... for wa.me.
 *
 * Returns null when there is nothing usable, and the caller should then
 * open WhatsApp without a recipient so the member picks from their own
 * contacts. Guessing at a recipient would be worse than asking.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;

  // Already international, either as 27... or with the 0027 prefix some
  // people type.
  if (digits.startsWith("0027")) return digits.slice(2);
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}
