import "server-only";

import { createSvcClient } from "@/lib/svc/db";
import {
  listMemberIssues,
  markOpened,
  markClaimed,
  markSelfRedeemed,
  periodFor,
  type BenefitIssue,
} from "@/lib/svc/ledger";

/**
 * The internal coupon interface (handoff section 9), defined before the
 * provider's catalogue documentation exists so nothing above it ever
 * learns which implementation answered. Operations, per the handoff:
 * authenticate a member, fetch the catalogue, fetch a member's available
 * coupons, select or claim a coupon, confirm the selection, and fetch
 * redemption events.
 *
 * Today's implementation is the manual import path: an admin uploads the
 * month's coupon file, the issue run hands codes to members, and this
 * interface reads and writes the ledger directly. When MiFuel's catalogue
 * and redemption documentation arrives (Appendix A Q3-13), a MiFuelProvider
 * implements this same shape and the screens above it do not change.
 */
export type CouponCatalogueItem = {
  issueId: string;
  benefitName: string;
  description: string | null;
  faceValueCents: number;
  status: BenefitIssue["status"];
  uniqueCode: string | null;
  openedAt: string | null;
  claimedAt: string | null;
  redeemedAt: string | null;
};

export interface CouponProvider {
  /** The member's coupon set for the period: the catalogue they can act on. */
  memberCoupons(memberId: string, period?: string): Promise<CouponCatalogueItem[]>;
  /** Member viewed the coupon: issued -> opened, once. */
  open(memberId: string, issueId: string): Promise<void>;
  /** Member selected/claimed the coupon for use: -> claimed. */
  claim(memberId: string, issueId: string): Promise<boolean>;
  /**
   * Member confirms they used it ("I used this"), with an optional real
   * amount. Recorded as self_reported; the provider-verified variants
   * arrive with the MiFuel integration in Sprint 4.
   */
  confirmUsed(memberId: string, issueId: string, amountCents?: number | null): Promise<boolean>;
}

function toCatalogueItem(issue: BenefitIssue): CouponCatalogueItem {
  return {
    issueId: issue.id,
    benefitName: issue.benefit?.name ?? "Coupon pack",
    description: issue.benefit?.description ?? null,
    faceValueCents: issue.face_value_cents,
    status: issue.status,
    uniqueCode: issue.unique_code,
    openedAt: issue.opened_at,
    claimedAt: issue.claimed_at,
    redeemedAt: issue.redeemed_at,
  };
}

class ManualImportProvider implements CouponProvider {
  async memberCoupons(memberId: string, period: string = periodFor()): Promise<CouponCatalogueItem[]> {
    const issues = await listMemberIssues(memberId, period);
    return issues
      .filter((i) => i.benefit?.benefit_type === "coupon_pack")
      .map(toCatalogueItem);
  }

  async open(memberId: string, issueId: string): Promise<void> {
    await markOpened(issueId, memberId);
  }

  async claim(memberId: string, issueId: string): Promise<boolean> {
    return markClaimed(issueId, memberId);
  }

  async confirmUsed(memberId: string, issueId: string, amountCents?: number | null): Promise<boolean> {
    return markSelfRedeemed(issueId, memberId, amountCents);
  }
}

/** The active provider. Configuration decides once MiFuel exists. */
export function couponProvider(): CouponProvider {
  return new ManualImportProvider();
}

/**
 * The coupon partner's own redemption portal, where members browse and
 * check out their actual coupons until the partner exposes API endpoints
 * for doing it inside SVC. Sending members off-site is the handoff's
 * route 3 and shipped only on Dewald's explicit decision, 5 August, with
 * the URL he supplied. A database setting rather than an env var, so the
 * day the URL changes it is one update, no deploy.
 */
export async function couponPortalUrl(): Promise<string | null> {
  const db = createSvcClient();
  const { data } = await db
    .from("setting")
    .select("value")
    .eq("key", "coupon_portal_url")
    .maybeSingle();
  const url = typeof data?.value === "string" ? data.value : null;
  return url && /^https:\/\//.test(url) ? url : null;
}

/**
 * Admin's manual import: registers the month's coupon file for a benefit
 * and loads its codes (one per line; blank lines and duplicates dropped).
 * Codes are handed to members by the issue run. A file may also carry zero
 * codes for packs whose codes live in the provider's own app.
 */
export async function importCouponFile({
  benefitId,
  period,
  codes,
  note,
  uploadedBy,
}: {
  benefitId: string;
  period: string;
  codes: string[];
  note?: string;
  uploadedBy?: string;
}): Promise<{ ok: boolean; fileId?: string; codeCount?: number; error?: string }> {
  const db = createSvcClient();

  const { data: file, error: fileError } = await db
    .from("coupon_file")
    .upsert(
      { benefit_id: benefitId, period, note: note ?? null, uploaded_by: uploadedBy ?? null },
      { onConflict: "benefit_id,period" }
    )
    .select("id")
    .single();
  if (fileError || !file) {
    console.error("SVC coupon file upsert failed", fileError);
    return { ok: false, error: "file" };
  }

  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (unique.length > 0) {
    const { error: codesError } = await db
      .from("coupon_code")
      .upsert(
        unique.map((code) => ({ file_id: file.id, code })),
        { onConflict: "file_id,code", ignoreDuplicates: true }
      );
    if (codesError) {
      console.error("SVC coupon codes insert failed", codesError);
      return { ok: false, error: "codes" };
    }
  }

  return { ok: true, fileId: file.id, codeCount: unique.length };
}
