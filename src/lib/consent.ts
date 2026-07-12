// Combined spec Sec 34: client-side-only consent state for the Meta Pixel
// (localStorage, not a cookie — nothing here needs to be read server-side,
// and the CAPI server-side send in lib/meta/capi.ts is entirely unaffected
// by this choice either way). 180 days sits inside the spec's 6-12 month
// "reasonable period" window.
const CONSENT_KEY = "df_pixel_consent";
const CONSENT_DURATION_DAYS = 180;

export type ConsentStatus = "accepted" | "rejected";

export function getStoredConsent(): ConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status: ConsentStatus; expiresAt: number };
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.status === "accepted" || parsed.status === "rejected" ? parsed.status : null;
  } catch {
    return null;
  }
}

export function storeConsent(status: ConsentStatus) {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ status, expiresAt }));
  } catch {
    // Private browsing / storage disabled — falls back to re-prompting every
    // visit, which is the safe direction to fail in (never fires the Pixel
    // without a decision this session).
  }
}
