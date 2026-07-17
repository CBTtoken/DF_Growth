import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Real feedback (first real agent onboarded): a random 7-char code read as
// cold and impersonal for something meant to double as a selling tool
// ("I also want to be an agent"). Now derived from the agent's first name
// — losaan, then losaan2 for a second Losaan — readable and memorable when
// shared on social media, matching how the agent's own audience already
// knows them by name, not by code.
const FALLBACK_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function randomFallbackSlug(length = 7): string {
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += FALLBACK_ALPHABET[crypto.randomInt(FALLBACK_ALPHABET.length)];
  }
  return slug;
}

// First whitespace-separated word of the full name, lowercased, stripped
// to letters/digits only — "Losaan Vd Westhuizen Meiring" -> "losaan". A
// name with no usable first-name characters at all (rare, but not
// impossible) falls back to a short random slug rather than producing an
// empty or unreadable one.
function baseSlugFromName(fullName: string): string {
  const firstWord = fullName.trim().split(/\s+/)[0] ?? "";
  const cleaned = firstWord.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : randomFallbackSlug();
}

// Collision handling per the confirmed convention: losaan, losaan2,
// losaan3... — checked against the live table since two agents sharing a
// first name is a real, expected case, not an edge case to ignore.
export async function generateUniqueReferralCode(fullName: string): Promise<string> {
  const admin = createAdminClient();
  const base = baseSlugFromName(fullName);

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const { data } = await admin.from("agents").select("id").eq("referral_code", candidate).maybeSingle();
    if (!data) return candidate;
  }

  throw new Error("Could not generate a unique referral slug after 50 attempts");
}
