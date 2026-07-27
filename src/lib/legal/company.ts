// The company's own confirmed details, and the dates on the legal
// documents, in one place.
//
// Legal Pages Rebuild Brief Part 3 and Part 5 item 8. Two separate reasons
// for this file:
//
// 1. ECTA section 43 requires these disclosures on a site that sells
//    electronically, and a supplier who fails to make them hands the
//    customer a cancellation right. That is a commercial consequence, so
//    the block must appear on every property, which means it cannot be
//    retyped per page.
// 2. "Last updated" and "Effective date" have to be driven by a constant
//    rather than typed into each page, or they drift apart from each other
//    and from the content they describe.
//
// Every value here was confirmed by Dewald on 27 July 2026 and is recorded
// in the handover index. Nothing in this file may be guessed.

export const COMPANY = {
  legalName: "Digital Flyer (Pty) Ltd",
  registrationNumber: "2018/350974/07",
  tradingName: "DigitalFlyer SA",
  address: "609 Swart Street, Pretoria, 0044, South Africa",
  // Published on the live site as a WhatsApp number, and it also serves as
  // the ECTA contact number, so it is labelled as both rather than
  // implying a separate voice line that does not exist.
  phone: "+27 72 311 0570",
  email: "info@digitalflyer.co.za",
} as const;

export const INFORMATION_OFFICER = {
  name: "Dewald Rosema",
  registrationNumber: "2026-061838",
  registeredOn: "11 July 2026",
  email: "info@digitalflyer.co.za",
} as const;

// The Regulator moved to its own domain. The live privacy policy still
// pointed at www.justice.gov.za/inforeg, which is dead.
export const INFORMATION_REGULATOR = {
  website: "https://inforegulator.org.za",
  popiaComplaints: "POPIAComplaints@inforegulator.org.za",
  paiaComplaints: "PAIAComplaints@inforegulator.org.za",
  postal: "P.O. Box 31533, Braamfontein, Johannesburg, 2017",
} as const;

/**
 * Shown on every legal page. Bump both when the wording changes, not when
 * the page is merely redeployed.
 */
export const LEGAL_LAST_UPDATED = "28 July 2026";
export const LEGAL_EFFECTIVE_DATE = "28 July 2026";

/**
 * Brief Part 2.2: the same routes are served on every mapped domain rather
 * than redirecting, so a canonical host is needed or search engines treat
 * them as duplicates. Growth is canonical because it is the established
 * property.
 */
export const LEGAL_CANONICAL_HOST = "https://growth.digitalflyersa.co.za";

/** One line, for places too tight for the full block. */
export const COMPANY_ONE_LINER = `${COMPANY.legalName}, registration number ${COMPANY.registrationNumber}, trading as ${COMPANY.tradingName}.`;
