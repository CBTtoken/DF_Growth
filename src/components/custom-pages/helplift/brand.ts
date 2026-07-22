// Helplift Network Vaal Triangle — shared brand tokens for the custom page.
// Blue + lime green sampled from the real logo (public/custom-pages/
// helplift/logo.png): a soft steel blue and a bright lime, matching the
// circle/heart and the two figures. Every component reads them from here.
export const HELPLIFT_BLUE = "#2F6DA4";
export const HELPLIFT_BLUE_DARK = "#1E4E7A";
export const HELPLIFT_LIME = "#8BC53F";
export const HELPLIFT_LIME_DARK = "#6FA82E";
export const HELPLIFT_INK = "#1C2B2A";
export const HELPLIFT_CREAM = "#F6F9F4";

// Real circular logo is in place — the hero renders it.
export const HAS_LOGO = true;

// Real Helplift material: the 2025/26 operational impact infographic plus
// their own branded skills-development graphics (certificate presentations,
// finished sewing projects). All Helplift-branded, no NWU / "Global
// Innovative Forefront Talent" marks (excluded per the brief).
export const GALLERY_IMAGES: { src: string; alt: string; wide?: boolean }[] = [
  {
    src: "/custom-pages/helplift/impact-2025-26.jpg",
    alt: "Helplift Network operational model and community impact for 2025/26",
    wide: true,
  },
  {
    src: "/custom-pages/helplift/skills-sewing-completed.jpg",
    alt: "Participants receiving certificates after completing a Helplift sewing course",
  },
  {
    src: "/custom-pages/helplift/skills-projects.jpg",
    alt: "Skills-development participants with finished bags and blankets they made",
  },
  {
    src: "/custom-pages/helplift/skills-certificates.jpg",
    alt: "Certificate presentations from a Helplift basic sewing training course",
  },
  {
    src: "/custom-pages/helplift/skills-sewing-classes.jpg",
    alt: "Learners who completed a sewing-on-machine course at Helplift",
  },
];

// Helplift is enrolled as a real agent (referral_code "helplift") — the
// "Partner With Us" button uses their genuine referral link.
export const PARTNER_REFERRAL_URL: string | null = "https://growth.digitalflyersa.co.za/r/helplift";
