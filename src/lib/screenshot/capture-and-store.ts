import { createAdminClient } from "@/lib/supabase/admin";
import { captureScreenshot } from "./capture";

// Shared by the weekly refresh cron (src/app/api/cron/refresh-screenshots)
// and the admin "refresh now" action — one client, one capture, one
// upload, one DB update. Fixed {clientId}.jpg path, overwritten on every
// refresh (no history kept, no storage growth) since only the current
// state of the page is ever useful for marketing imagery.
export async function captureAndStoreScreenshot(
  clientId: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const pageUrl = `${siteUrl}/${slug}`;

  const bytes = await captureScreenshot(pageUrl);
  if (!bytes) return { ok: false, error: "Screenshot capture failed" };

  const admin = createAdminClient();
  const path = `${clientId}.jpg`;

  const { error: uploadError } = await admin.storage
    .from("client-screenshots")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { error: updateError } = await admin
    .from("growth_clients")
    .update({ screenshot_path: path, screenshot_captured_at: new Date().toISOString() })
    .eq("id", clientId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}
