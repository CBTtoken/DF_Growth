import { createAdminClient } from "@/lib/supabase/admin";
import { buildAccountantExport } from "@/lib/bizup/accountant-export";
import type { Period } from "@/lib/bizup/period";

// The accountant's download. Deliberately unauthenticated.
//
// Spec Sec 12 wants the pack delivered as a secure expiring link rather
// than an email attachment, and the person opening it is the member's
// accountant, who has no login here and never will. So the token IS the
// authentication: 32 random bytes, checked against a row that carries its
// own expiry.
//
// Rendering happens now rather than at creation time, so no archive of a
// member's customer list is ever stored anywhere.

// PDF rendering needs Node, not the edge runtime.
export const runtime = "nodejs";
// This pack is built per request and must never be cached by a CDN.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("bizup_export_links")
    .select("id, account_id, period_from, period_to, expires_at, download_count")
    .eq("token", token)
    .maybeSingle();

  // One message for "no such link" and "expired link" alike. Telling the
  // difference would confirm that a guessed token was once real.
  const gone = () =>
    new Response(
      "This download link is no longer available. Please ask for a new one.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );

  if (!link) return gone();
  if (new Date(link.expires_at).getTime() < Date.now()) return gone();

  const period: Period = {
    id: "custom",
    from: link.period_from,
    to: link.period_to,
    label: `${link.period_from} to ${link.period_to}`,
  };

  const result = await buildAccountantExport(link.account_id, period);
  if (!result) return gone();

  // Recorded after the pack is successfully built, so a failed render does
  // not show up as a download the member has to explain.
  await admin
    .from("bizup_export_links")
    .update({
      download_count: link.download_count + 1,
      first_downloaded_at: link.download_count === 0 ? new Date().toISOString() : undefined,
    })
    .eq("id", link.id);

  return new Response(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store, private",
      // This link is meant to be opened directly, never framed or indexed.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
