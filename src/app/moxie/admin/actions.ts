"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCodeBatch, requirePublisher } from "@/lib/moxie/admin";
import { moxiePath, MOXIE_PREFIX } from "@/lib/moxie/host";

export async function createCodeBatch(formData: FormData) {
  // Checked in the action and not only on the screen. A server action is a
  // public endpoint, and hiding a button says nothing at all about what can
  // be posted to it.
  const publisher = await requirePublisher();
  if (!publisher) redirect(await moxiePath("/login?next=/admin"));

  const editionId = String(formData.get("editionId") ?? "");
  const count = Number(formData.get("count") ?? 0);
  const label = String(formData.get("label") ?? "").trim();

  if (!editionId || !Number.isFinite(count) || count < 1) {
    redirect(await moxiePath("/admin?error=input"));
  }

  const { created } = await generateCodeBatch(editionId, Math.floor(count), label);
  revalidatePath(`${MOXIE_PREFIX}/admin`);
  redirect(await moxiePath(`/admin?created=${created}`));
}

/**
 * Puts somebody on the Moxie team.
 *
 * Dewald, 3 August: "can I give them accounts that they can login to Moxie
 * admin dashboard and Kwaai Press". One emag_members row is both doors:
 * a publisher gets this dashboard and the whole builder, a writer gets the
 * builder's writing side only.
 *
 * If no account exists for the address, one is created with the password
 * typed here, pre-confirmed, and no email is sent: Dewald hands the
 * password over himself, which for a handful of colleagues beats an invite
 * flow that needs its own token table and expiry rules.
 */
export async function addTeamMember(formData: FormData) {
  const publisher = await requirePublisher();
  if (!publisher) redirect(await moxiePath("/login?next=/admin"));

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@") || (role !== "writer" && role !== "publisher")) {
    redirect(await moxiePath("/admin?team_error=input"));
  }

  const admin = createAdminClient();
  const { data: publication } = await admin
    .from("emag_publications")
    .select("id")
    .eq("slug", "moxie")
    .maybeSingle();
  if (!publication) redirect(await moxiePath("/admin?team_error=publication"));

  // Existing account first: colleagues may already be readers.
  let userId: string | null = null;
  let page = 1;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) {
      userId = hit.id;
      break;
    }
    if (data.users.length < 1000) break;
    page++;
  }

  if (!userId) {
    if (password.length < 8) {
      // A new account needs a real password; an existing one ignores the field.
      redirect(await moxiePath("/admin?team_error=password"));
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created.user) {
      console.error("Could not create team account", error);
      redirect(await moxiePath("/admin?team_error=create"));
    }
    userId = created.user.id;
  }

  const { error: memberError } = await admin.from("emag_members").upsert(
    {
      user_id: userId,
      publication_id: publication!.id,
      role,
      display_name: displayName || null,
    },
    { onConflict: "user_id,publication_id" }
  );
  if (memberError) {
    console.error("Could not save team membership", memberError);
    redirect(await moxiePath("/admin?team_error=save"));
  }

  revalidatePath(`${MOXIE_PREFIX}/admin`);
  redirect(await moxiePath(`/admin?team_added=${encodeURIComponent(email)}`));
}

/**
 * Takes somebody off the team. The emag_members row goes; the auth account
 * stays, because it may also be a reader account with a membership on it.
 * Never removes the owner addresses, which requirePublisher treats as a
 * floor for exactly this reason.
 */
export async function removeTeamMember(formData: FormData) {
  const publisher = await requirePublisher();
  if (!publisher) redirect(await moxiePath("/login?next=/admin"));

  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect(await moxiePath("/admin?team_error=input"));

  const admin = createAdminClient();
  const { data: publication } = await admin
    .from("emag_publications")
    .select("id")
    .eq("slug", "moxie")
    .maybeSingle();
  if (publication) {
    await admin
      .from("emag_members")
      .delete()
      .eq("user_id", userId)
      .eq("publication_id", publication.id);
  }

  revalidatePath(`${MOXIE_PREFIX}/admin`);
  redirect(await moxiePath("/admin?team_removed=1"));
}
