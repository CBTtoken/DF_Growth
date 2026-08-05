// The Meta connection for Facebook/HANDOFF-digitalflyer-page-poster.md.
// Publishes to the DigitalFlyer SA Facebook page only, never to a member's
// own page and never to a group (Meta removed group publishing for every
// app in April 2024, so that path is not built at all).
//
// Standard Access, not Advanced: Dewald is admin of both the app and the
// DigitalFlyer SA page, so pages_manage_posts + pages_read_engagement work
// under Standard Access with a Page token derived from his own long-lived
// user token (see the handoff's Sec 1, question 1 — App Review and Business
// Verification are for acting on OTHER people's pages, which this build
// never does). Graph API version kept in lockstep with the rest of the
// codebase's Meta calls (lib/meta/capi.ts, lib/meta/digitalflyer-capi.ts,
// lib/whatsapp/graph-api.ts all sit on v25.0, verified 2026-07/08) —
// re-verify before reusing this file far in the future.
const GRAPH_API_VERSION = "v25.0";

function pageId(): string | undefined {
  return process.env.DIGITALFLYER_META_PAGE_ID;
}

function pageToken(): string | undefined {
  return process.env.DIGITALFLYER_META_PAGE_ACCESS_TOKEN;
}

// Env vars unset is a normal, expected state before Dewald has connected
// the page (see the report's numbered steps) — the queue still generates
// and fills with approvals waiting, it just cannot publish yet. Distinct
// from a token that WAS set and has since died, which publishPost surfaces
// per-post via failure_reason instead of going silent (handoff acceptance
// criterion 6: "token expiry does not silently stop the scheduler").
export function pagePosterConfigured(): boolean {
  return !!pageId() && !!pageToken();
}

export type PublishResult =
  | { ok: true; postId: string }
  | { ok: false; status: number; error: string; tokenExpired: boolean };

// Meta's OAuthException error subcode for an expired or revoked token.
// Surfaced separately from a generic failure so the admin screen can show
// "reconnect the page" rather than a raw error string.
const TOKEN_EXPIRED_SUBCODES = new Set([463, 467, 460]);

async function graphPost(path: string, body: Record<string, string>): Promise<PublishResult> {
  const id = pageId();
  const token = pageToken();
  if (!id || !token) {
    return { ok: false, status: 0, error: "Page poster is not connected (missing env vars)", tokenExpired: false };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...body, access_token: token }),
    });
    const json = (await res.json().catch(() => null)) as
      | { id?: string; post_id?: string; error?: { message?: string; code?: number; error_subcode?: number } }
      | null;

    if (!res.ok || !json || json.error) {
      const subcode = json?.error?.error_subcode;
      return {
        ok: false,
        status: res.status,
        error: json?.error?.message ?? `Graph API returned ${res.status} with no error body`,
        tokenExpired: json?.error?.code === 190 && (subcode === undefined || TOKEN_EXPIRED_SUBCODES.has(subcode)),
      };
    }

    return { ok: true, postId: json.post_id ?? json.id ?? "" };
  } catch (err) {
    console.error("Page poster Graph API request failed", err);
    return { ok: false, status: -1, error: err instanceof Error ? err.message : String(err), tokenExpired: false };
  }
}

// Text and link posts share the /feed endpoint. A link attachment renders
// as a proper preview card; a photo post (below) can only carry a link as
// plain text in the caption, which Facebook still auto-links, so callers
// with a photo should fold the URL into `message` themselves.
export async function publishTextPost(message: string, linkUrl?: string | null): Promise<PublishResult> {
  const id = pageId();
  if (!id) return { ok: false, status: 0, error: "Page poster is not connected (missing env vars)", tokenExpired: false };
  return graphPost(`${id}/feed`, {
    message,
    ...(linkUrl ? { link: linkUrl } : {}),
  });
}

// Video and Reels are explicitly out of scope for this build (handoff
// "Out of scope"); this only ever posts a static photo a member already
// uploaded, never generates one.
export async function publishPhotoPost(message: string, photoUrl: string): Promise<PublishResult> {
  const id = pageId();
  if (!id) return { ok: false, status: 0, error: "Page poster is not connected (missing env vars)", tokenExpired: false };
  return graphPost(`${id}/photos`, {
    url: photoUrl,
    caption: message,
    published: "true",
  });
}

export type TokenStatus =
  | { checked: true; valid: true; expiresAt: number | null }
  | { checked: true; valid: false; error: string }
  | { checked: false; reason: "not_configured" };

// For the admin screen's connection banner, not the publish path itself —
// publishing surfaces its own failure per post regardless of this check.
// A Page token minted from a long-lived user token does not carry a fixed
// expiry the way a short-lived token does (data_access_expires_at / 0 for
// "does not expire" is normal here), but it still dies the moment the
// underlying user token is revoked or the user changes their Facebook
// password, which this cannot predict in advance — only detect after the
// fact via debug_token or a failed publish.
export async function checkPageToken(): Promise<TokenStatus> {
  const token = pageToken();
  if (!token) return { checked: false, reason: "not_configured" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
    );
    const json = (await res.json().catch(() => null)) as {
      data?: { is_valid?: boolean; expires_at?: number };
      error?: { message?: string };
    } | null;

    if (!res.ok || !json || json.error || !json.data) {
      return { checked: true, valid: false, error: json?.error?.message ?? `debug_token returned ${res.status}` };
    }
    if (!json.data.is_valid) {
      return { checked: true, valid: false, error: "Meta reports this token is no longer valid" };
    }
    return { checked: true, valid: true, expiresAt: json.data.expires_at ?? null };
  } catch (err) {
    return { checked: true, valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
