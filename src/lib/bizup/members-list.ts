import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_TYPES, servicePlural } from "./services";

// The KatisoBiz Members List.
//
// Two rules decide everything about what this returns.
//
// Opt in. Nobody appears unless they asked to. They signed up for quoting
// software, not for publication.
//
// Actually using it. Dewald: "only those who are actually using the
// system". A page full of empty signups is worse than a short page, and we
// already know exactly who has issued a document.

export interface ListedMember {
  id: string;
  name: string;
  serviceId: string;
  serviceLabel: string;
  town: string | null;
  whatsapp: string;
}

export interface ListedGroup {
  serviceId: string;
  heading: string;
  members: ListedMember[];
}

/**
 * Normalises a South African number for wa.me. Kept as its own step here
 * rather than reusing the quote sender's helper, because a listing must
 * simply omit anyone whose number cannot be dialled rather than falling
 * back to WhatsApp's contact picker: a public button that opens an empty
 * chat is worse than no button.
 */
function whatsappOrNull(raw: string | null): string | null {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("0027")) return digits.slice(2);
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

export async function loadMembersList(): Promise<ListedGroup[]> {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from("bizup_accounts")
    .select("id, business_name, trading_name, service_type, city, whatsapp, phone")
    .eq("listed_publicly", true)
    .not("service_type", "is", null)
    .order("business_name");

  const candidates = accounts ?? [];
  if (candidates.length === 0) return [];

  // "Actually using the system" means at least one issued document. Checked
  // against documents rather than a flag on the account, so it stays true
  // by itself as members start and stop.
  const { data: docs } = await admin
    .from("bizup_documents")
    .select("account_id")
    .in(
      "account_id",
      candidates.map((a) => a.id),
    )
    .not("number", "is", null);

  const active = new Set((docs ?? []).map((d) => d.account_id));

  const members: ListedMember[] = [];
  for (const a of candidates) {
    if (!active.has(a.id)) continue;

    const whatsapp = whatsappOrNull(a.whatsapp ?? a.phone);
    if (!whatsapp) continue;

    members.push({
      id: a.id,
      // The trading name is what customers know them by when it differs.
      name: a.trading_name?.trim() || a.business_name,
      serviceId: a.service_type as string,
      serviceLabel: servicePlural(a.service_type),
      town: a.city?.trim() || null,
      whatsapp,
    });
  }

  // Grouped by trade, in the order the service list defines rather than
  // alphabetically, so the trades this product is actually aimed at sit at
  // the top instead of "Air conditioning" always leading.
  return SERVICE_TYPES.map((s) => ({
    serviceId: s.id,
    heading: s.plural,
    members: members.filter((m) => m.serviceId === s.id),
  })).filter((g) => g.members.length > 0);
}
