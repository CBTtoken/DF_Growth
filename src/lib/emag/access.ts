import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Who may do what, using the existing Supabase auth.
//
// There is no self-signup. A person can use the builder because the
// publisher put a row in emag_members for them, and that row is the whole
// permission model:
//
//   writer     creates and edits articles, submits for approval
//   publisher  everything, including the flatplan and publishing
//
// Every screen calls one of the two guards below. They redirect rather than
// render an empty page, because a writer who lands on the flatplan should
// end up somewhere useful rather than staring at a screen that does nothing.

export type EmagRole = "writer" | "publisher";

export type EmagUser = {
  userId: string;
  email: string | null;
  role: EmagRole;
  displayName: string | null;
  publicationId: string;
};

export const MOXIE_SLUG = "moxie";

/** The publication row. One per install today, looked up by slug. */
export async function getPublication(slug: string = MOXIE_SLUG) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("emag_publications")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not read the publication: ${error.message}`);
  return data;
}

/**
 * The signed-in person's membership, or null.
 *
 * Reads the session with the user-scoped client and then the membership
 * with the admin client. The split matters: the session must come from the
 * caller's own cookies and must not be spoofable, while emag_members has
 * RLS on and is only readable by service_role.
 */
export async function getEmagUser(slug: string = MOXIE_SLUG): Promise<EmagUser | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const publication = await getPublication(slug);
  if (!publication) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("emag_members")
    .select("role, display_name")
    .eq("user_id", user.id)
    .eq("publication_id", publication.id)
    .maybeSingle();

  if (error) throw new Error(`Could not read the membership: ${error.message}`);
  if (!data) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.role as EmagRole,
    displayName: data.display_name,
    publicationId: publication.id,
  };
}

/** Any member. Writers and publishers both. */
export async function requireEmagUser(slug: string = MOXIE_SLUG): Promise<EmagUser> {
  const user = await getEmagUser(slug);
  if (!user) redirect("/bizup/login?next=/emag/moxie");
  return user;
}

/**
 * The same check, for a server action, which throws instead of redirecting.
 *
 * Dewald, 1 August 2026: "it kicked me out after submitting for approval".
 * That was this. A redirect is the right answer on a screen, where somebody
 * has arrived without a session and needs to sign in. Inside an action it is
 * the wrong answer twice over: it looks like being thrown out of the
 * application in the middle of working, and it throws away the unsaved
 * article that prompted the action in the first place.
 *
 * A thrown error surfaces as a message on the screen the writer is already
 * on, with their work still in front of them. If the session really has
 * lapsed they can open a new tab, sign in, and press the button again
 * without losing a word.
 */
export async function requireEmagUserForAction(slug: string = MOXIE_SLUG): Promise<EmagUser> {
  const user = await getEmagUser(slug);
  if (!user) {
    throw new Error(
      "Your session has expired. Open Kwaai Press in another tab, sign in again, then press this once more. Nothing you have typed is lost."
    );
  }
  return user;
}

/** Publisher only, for a server action. Throws rather than redirecting. */
export async function requirePublisherForAction(slug: string = MOXIE_SLUG): Promise<EmagUser> {
  const user = await requireEmagUserForAction(slug);
  if (user.role !== "publisher") {
    throw new Error("Only a publisher can do that.");
  }
  return user;
}

/**
 * A publisher.
 *
 * The flatplan, publishing and account creation live behind this. A writer
 * who reaches one of those is sent back to the work they can actually do,
 * not shown a permission error they can do nothing about.
 */
export async function requirePublisher(slug: string = MOXIE_SLUG): Promise<EmagUser> {
  const user = await requireEmagUser(slug);
  if (user.role !== "publisher") redirect("/bizup/emag/moxie");
  return user;
}
