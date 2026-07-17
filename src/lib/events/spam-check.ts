// List Your Event Sec 6: "a basic completeness and spam-pattern check."
// Deliberately basic, matching the spec's own framing — not claiming ML or
// sophisticated detection, just the honest, buildable version: a handful
// of concrete signals a real spam listing tends to show, none of which a
// genuine organiser would normally trip. Any single signal is enough to
// route the submission to admin review instead of auto-publishing — see
// Sec 6: "routes to a manual admin review queue before it goes live,
// rather than publishing first and cleaning up after."
const URL_PATTERN = /https?:\/\/|www\./i;
const REPEATED_CHAR_PATTERN = /(.)\1{7,}/;
const SPAM_KEYWORDS = ["viagra", "casino", "crypto pump", "forex signals", "click here now", "make money fast"];

export function detectSpamSignal({
  eventName,
  description,
}: {
  eventName: string;
  description: string;
}): string | null {
  if (URL_PATTERN.test(eventName)) {
    return "Event name contains a link — organisers don't normally need one there.";
  }

  const urlMatches = description.match(new RegExp(URL_PATTERN, "gi")) ?? [];
  if (urlMatches.length >= 3) {
    return "Description contains multiple links.";
  }

  if (REPEATED_CHAR_PATTERN.test(eventName) || REPEATED_CHAR_PATTERN.test(description)) {
    return "Unusual repeated characters in the event name or description.";
  }

  const lowerText = `${eventName} ${description}`.toLowerCase();
  const matchedKeyword = SPAM_KEYWORDS.find((word) => lowerText.includes(word));
  if (matchedKeyword) {
    return `Contains a flagged phrase ("${matchedKeyword}").`;
  }

  // Sec 6: "a domain full of thin, spammy pages can hurt Google's overall
  // view of the site" — a listing with no description and no photos is
  // the honest definition of "thin" here, not necessarily spam, but worth
  // a human glance before it's indexed.
  return null;
}

export function detectThinListing({
  description,
  imageCount,
}: {
  description: string;
  imageCount: number;
}): string | null {
  if (!description.trim() && imageCount === 0) {
    return "No description and no photos — thin listing, worth a quick human check before it's indexed.";
  }
  return null;
}
