import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Is there already an account on this email address?
 *
 * Dewald, 9 August 2026: "I just realised I registered again with the same
 * account and it took me through the whole process without telling me I am
 * already registered."
 *
 * `supabase.auth.signUp()` is supposed to signal this by returning a user
 * with an empty `identities` array, and that check is still in place, but
 * it is not reliable in every state: an existing but unconfirmed account
 * gets a fresh confirmation mail instead, and the person is walked through
 * a code they have already used once, ending up somewhere confusing.
 *
 * So this asks the admin API directly, and matches in code rather than
 * trusting a server-side filter. GoTrue's `?email=` filter is silently
 * ignored on this project (already burned us once, in the Growth admin
 * user list, where it returned every user and the first row was treated as
 * the match). Paginated, lowercase-trimmed, exact.
 *
 * Fails open: if the lookup itself errors we return false and let the
 * normal signUp path decide, because blocking a real person from
 * registering is worse than letting a duplicate attempt through to the
 * check that already exists.
 */
export async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const needle = email.trim().toLowerCase();
  if (!needle) return false;

  const admin = createAdminClient();
  const perPage = 1000;

  try {
    // Bounded on purpose: a handful of pages covers this project many times
    // over, and an unbounded loop against a paging API is how a signup
    // screen ends up hanging.
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return false;

      const users = data?.users ?? [];
      if (users.some((u) => (u.email ?? "").trim().toLowerCase() === needle)) return true;
      if (users.length < perPage) return false;
    }
    return false;
  } catch {
    return false;
  }
}
