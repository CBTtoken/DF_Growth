import { createAdminClient } from "@/lib/supabase/admin";
import { listMemberThreads, listIdentityThreads, type ChatThread } from "@/lib/board/chat";

// Contacts, built out of conversations rather than out of a form.
//
// Dewald's idea, and the good half of the "custom contact list" note. A web
// app cannot reach a phone's contacts, and a contact book somebody has to
// fill in by hand stays empty. But every conversation on this platform
// already names two parties and says when they last spoke, so the contact
// list can build itself out of work that actually happened.
//
// Two sides of the same thing:
//
//   Clients    people who have contacted a business, or who it has quoted.
//   Providers  businesses a person has engaged with.
//
// A member sees both, because a member is also a person: he has clients who
// came through the board, and he has a plumber of his own.

export type BoardContact = {
  id: string;
  name: string;
  /** Where the contact came from, in plain words. */
  source: string;
  lastAt: string;
  /** Set when there is a conversation to open. */
  threadHref: string | null;
  /** Set for a business contact with a page. */
  pageHref: string | null;
  logoUrl: string | null;
  brandColor: string;
  unread: number;
  /** Set when this person has also been invoiced or quoted in KatisoBiz. */
  documentCount?: number;
};

function fromThread(thread: ChatThread, side: "member" | "public"): BoardContact {
  const isClient = side === "member";
  return {
    id: thread.id,
    name: isClient ? thread.personName : thread.businessName,
    source: isClient ? "Messaged you on the board" : "You messaged them",
    lastAt: thread.lastMessageAt,
    threadHref: isClient ? `/dashboard/messages?thread=${thread.id}` : `/board/chat/${thread.businessSlug}`,
    pageHref: isClient ? null : `/${thread.businessSlug}`,
    logoUrl: isClient ? null : thread.businessLogoUrl,
    brandColor: isClient ? "#4a5568" : thread.brandColor,
    unread: thread.unread,
  };
}

/**
 * A business's clients.
 *
 * Everybody who has messaged it through the board, plus everybody it has
 * quoted or invoiced in KatisoBiz, which is the "did work for" half of
 * Dewald's description. The two are matched on name, because that is the
 * only thing the board and the invoicing side reliably share: a board
 * contact may have given no email at all, and a KatisoBiz customer often has
 * no board identity.
 */
export async function listClients(growthClientId: string): Promise<BoardContact[]> {
  const admin = createAdminClient();
  const threads = await listMemberThreads(growthClientId);
  const contacts = threads.map((thread) => fromThread(thread, "member"));

  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!account) return contacts;

  const { data: customers } = await admin
    .from("bizup_customers")
    .select("id, name, created_at")
    .eq("account_id", account.id);

  if (!customers?.length) return contacts;

  const { data: documents } = await admin
    .from("bizup_documents")
    .select("customer_id")
    .eq("account_id", account.id)
    .not("customer_id", "is", null);

  const docCount = new Map<string, number>();
  for (const document of documents ?? []) {
    if (document.customer_id) docCount.set(document.customer_id, (docCount.get(document.customer_id) ?? 0) + 1);
  }

  const byName = new Map(contacts.map((c) => [c.name.trim().toLowerCase(), c]));

  for (const customer of customers) {
    const key = customer.name.trim().toLowerCase();
    const existing = byName.get(key);

    if (existing) {
      // Same person on both sides. One row, and it says so.
      existing.source = "Messaged you, and quoted in KatisoBiz";
      existing.documentCount = docCount.get(customer.id) ?? 0;
      continue;
    }

    contacts.push({
      id: `customer:${customer.id}`,
      name: customer.name,
      source: "Quoted or invoiced in KatisoBiz",
      lastAt: customer.created_at,
      threadHref: null,
      pageHref: null,
      logoUrl: null,
      brandColor: "#4a5568",
      unread: 0,
      documentCount: docCount.get(customer.id) ?? 0,
    });
  }

  return contacts.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** The businesses a person has engaged with. */
export async function listProviders(identityId: string): Promise<BoardContact[]> {
  const threads = await listIdentityThreads(identityId);
  return threads.map((thread) => fromThread(thread, "public"));
}
