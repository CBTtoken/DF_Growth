import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createSvcClient } from "@/lib/svc/db";

/**
 * Member identity helpers. The cell number is the canonical identifier
 * (handoff section 6); the auth user is how a browser session maps to a
 * member.
 */

export type SvcMember = {
  id: string;
  auth_user_id: string | null;
  cell_number: string;
  cell_verified_at: string | null;
  email: string;
  first_name: string;
  surname: string;
  status: string;
};

const MEMBER_SELECT =
  "id, auth_user_id, cell_number, cell_verified_at, email, first_name, surname, status";

/**
 * Normalises a South African cell number to 0XXXXXXXXX: digits only,
 * +27/27 prefixes converted, spaces and punctuation dropped. Returns null
 * when what remains is not a valid SA cell number.
 */
export function normalizeCell(raw: string): string | null {
  let digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+27")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("27") && digits.length === 11) digits = `0${digits.slice(2)}`;
  digits = digits.replace(/[^0-9]/g, "");
  return /^0[0-9]{9}$/.test(digits) ? digits : null;
}

export async function getMemberByCell(cell: string): Promise<SvcMember | null> {
  const db = createSvcClient();
  const { data } = await db
    .from("member")
    .select(MEMBER_SELECT)
    .eq("cell_number", cell)
    .maybeSingle();
  return (data as SvcMember | null) ?? null;
}

export async function getMemberByAuthUser(authUserId: string): Promise<SvcMember | null> {
  const db = createSvcClient();
  const { data } = await db
    .from("member")
    .select(MEMBER_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return (data as SvcMember | null) ?? null;
}

/** The signed-in member for the current request, or null. */
export async function getCurrentMember(): Promise<SvcMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getMemberByAuthUser(user.id);
}
