import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Sec 3: "a unique short referral code" generated on approval. Excludes
// visually ambiguous characters (0/O, 1/I/l) since this gets typed/read
// aloud by agents promoting it on Facebook, not just clicked.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(length = 7): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

// Collision odds are astronomically low at this scale, but a unique
// constraint exists on the column regardless — re-roll on the rare clash
// rather than trust probability alone.
export async function generateUniqueReferralCode(): Promise<string> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data } = await admin.from("agents").select("id").eq("referral_code", code).maybeSingle();
    if (!data) return code;
  }

  throw new Error("Could not generate a unique referral code after 5 attempts");
}
