import { createAdminClient } from "@/lib/supabase/admin";

// A member's own logo on their documents. Sold in the R49 tier and on the
// landing page, so this closes a claim rather than adding a new idea.
//
// Same shape as lib/agent-page/photo.ts, deliberately: validate, upload
// under a timestamped path, point the row at the new file, and only then
// delete the old one, so a failure anywhere leaves the existing logo
// working rather than leaving a member with no logo and no explanation.

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export const BIZUP_LOGO_BUCKET = "bizup-logos";

/**
 * The public URL for a stored logo, or null.
 *
 * Built from the Supabase URL rather than by asking the client, because
 * this is called during PDF rendering where there is no request context
 * and the customer's copy of a document has no session at all.
 */
export function bizupLogoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BIZUP_LOGO_BUCKET}/${path}`;
}

export async function replaceBizUpLogo(
  accountId: string,
  file: unknown,
): Promise<{ error: string } | { path: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first." };
  if (!ALLOWED.includes(file.type)) {
    return { error: "Use a PNG, JPG or WEBP image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "That image is over 2MB. Please use a smaller one." };
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("logo_path")
    .eq("id", accountId)
    .maybeSingle();

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Timestamped rather than a fixed name per account. The bucket is public
  // and therefore cached, so overwriting one path would keep serving the
  // old logo, including inside documents already sent to customers.
  const path = `${accountId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BIZUP_LOGO_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Failed to upload KatisoBiz logo", uploadError);
    return { error: "Could not upload that image. Please try again." };
  }

  await admin.from("bizup_accounts").update({ logo_path: path }).eq("id", accountId);

  if (account?.logo_path) {
    await admin.storage.from(BIZUP_LOGO_BUCKET).remove([account.logo_path]);
  }

  return { path };
}

export async function clearBizUpLogo(accountId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("logo_path")
    .eq("id", accountId)
    .maybeSingle();
  if (!account?.logo_path) return;

  await admin.from("bizup_accounts").update({ logo_path: null }).eq("id", accountId);
  await admin.storage.from(BIZUP_LOGO_BUCKET).remove([account.logo_path]);
}
