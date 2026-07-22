// Helplift Network Vaal Triangle — shared brand tokens for the custom page.
// Blue + lime green per HELPLIFT_CUSTOM_PAGE_SCOPE_CLAUDE.md Sec 4. These
// hexes are a considered placeholder pending the exact values sampled from
// the real logo (flagged to Dewald) — every component reads them from here
// so updating the pair is a one-file change.
export const HELPLIFT_BLUE = "#1B6FB3";
export const HELPLIFT_BLUE_DARK = "#155A93";
export const HELPLIFT_LIME = "#8BC53F";
export const HELPLIFT_LIME_DARK = "#6FA82E";
export const HELPLIFT_INK = "#1C2B2A";
export const HELPLIFT_CREAM = "#F6F9F4";

// Flip to true once public/custom-pages/helplift/logo.png (the clean
// transparent circular version) is in place. Until then the hero renders a
// typographic lockup rather than a broken image.
export const HAS_LOGO = false;

// Real sewing-course photos + the 2025/26 impact infographic go here once
// supplied (files in public/custom-pages/helplift/). Empty for now so the
// gallery shows a tasteful "coming" state instead of broken images. The
// page stays unpublished until this is populated.
export const GALLERY_IMAGES: { src: string; alt: string; wide?: boolean }[] = [];

// The genuine agent referral link for the "Partner With Us" button, once
// Helplift is enrolled as an agent (Sec 3). Null → the button falls back to
// the contact form rather than a dead link.
export const PARTNER_REFERRAL_URL: string | null = null;
