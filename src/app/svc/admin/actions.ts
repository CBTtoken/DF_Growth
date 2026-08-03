"use server";

import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { runMonthlyIssue, periodFor } from "@/lib/svc/ledger";
import { importCouponFile } from "@/lib/svc/coupons";
import { normalizeCell } from "@/lib/svc/member";

async function requireAdmin() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(await svcPath("/login"));
  return admin!;
}

/** The issue run, on demand. Idempotent, so pressing it twice is safe. */
export async function triggerIssueRun() {
  await requireAdmin();
  const result = await runMonthlyIssue();
  redirect(
    `${await svcPath("/admin")}?issued=${result.issued}&emailed=${result.membersEmailed}${
      result.error ? `&error=${result.error}` : ""
    }`
  );
}

/**
 * The month's coupon file: benefit, period, codes pasted one per line
 * (optional), and a note for the audit trail. This is handoff section 9's
 * manual import path, which is what lets a month be issued with no
 * provider API at all.
 */
export async function uploadCoupons(formData: FormData) {
  const admin = await requireAdmin();
  const benefitId = String(formData.get("benefit") ?? "");
  const periodRaw = String(formData.get("period") ?? "").trim();
  const codesRaw = String(formData.get("codes") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const period = /^\d{4}-\d{2}-01$/.test(periodRaw) ? periodRaw : periodFor();
  if (!benefitId) redirect(`${await svcPath("/admin")}?error=benefit`);

  const result = await importCouponFile({
    benefitId,
    period,
    codes: codesRaw.split(/\r?\n/),
    note: note || undefined,
    uploadedBy: admin.id,
  });

  redirect(
    `${await svcPath("/admin")}?${result.ok ? `uploaded=${result.codeCount}` : `error=${result.error}`}`
  );
}

/** Member lookup by cell number or email, straight to the ledger. */
export async function findMember(formData: FormData) {
  await requireAdmin();
  const query = String(formData.get("query") ?? "").trim();
  if (!query) redirect(`${await svcPath("/admin")}?error=query`);

  const db = createSvcClient();
  const cell = normalizeCell(query);
  const { data } = cell
    ? await db.from("member").select("id").eq("cell_number", cell).maybeSingle()
    : await db.from("member").select("id").ilike("email", query).limit(1).maybeSingle();

  if (!data) redirect(`${await svcPath("/admin")}?error=notfound`);
  redirect(`${await svcPath(`/admin/member/${data!.id}`)}`);
}
