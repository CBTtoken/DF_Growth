import "server-only";

import { createSvcClient } from "@/lib/svc/db";

/**
 * The MiFuel (Herminix) member provisioning client, live since 4 August
 * when org 9419 "SmartValue" was issued with an API key and product
 * 12039. Server-to-server per their Implementation Guide V1.4: the
 * credential lives here and only here, never in a browser.
 *
 * Verified against the live endpoint before this file was written: a
 * wrong key answers 401 "Verification Failed", the real key answers
 * success, and the base URL carries the /mifuel prefix their guide's
 * "Provided URL" shorthand hides.
 *
 * Config, all env: MIFUEL_ORG_ID, MIFUEL_API_KEY, MIFUEL_PRODUCT_TYPE,
 * MIFUEL_BASE_URL (default https://mifuel.co.za/mifuel), and
 * MIFUEL_APPLICANT_TYPE (default "2", Individual per the guide's own
 * table; their sample shows "1", a contradiction flagged with them).
 */

export function mifuelConfigured(): boolean {
  return !!(process.env.MIFUEL_ORG_ID && process.env.MIFUEL_API_KEY && process.env.MIFUEL_PRODUCT_TYPE);
}

function baseUrl(): string {
  return (process.env.MIFUEL_BASE_URL ?? "https://mifuel.co.za/mifuel").replace(/\/$/, "");
}

type MifuelMemberResponse = {
  success: number | boolean;
  action?: string;
  userid?: string | number;
  productlinkid?: string | number;
  message?: string;
};

/**
 * Creates or updates the member on MiFuel, keyed on their cell number,
 * and stores MiFuel's identifiers on the member row. Requires the
 * identity fields their API makes mandatory (title, date of birth, ID
 * number); callers gate on those existing.
 */
export async function provisionMifuelMember(memberId: string): Promise<{ ok: boolean; error?: string }> {
  if (!mifuelConfigured()) return { ok: false, error: "not_configured" };

  const db = createSvcClient();
  const { data: member } = await db
    .from("member")
    .select(
      "id, first_name, surname, cell_number, cell_verified_at, email, title, date_of_birth, id_type, id_number, nationality, mifuel_userid"
    )
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return { ok: false, error: "no_member" };
  if (!member.cell_verified_at) return { ok: false, error: "cell_unverified" };
  if (!member.title || !member.date_of_birth || !member.id_number || !member.id_type) {
    return { ok: false, error: "identity_incomplete" };
  }

  const body = {
    orgid: process.env.MIFUEL_ORG_ID,
    key: process.env.MIFUEL_API_KEY,
    producttype: process.env.MIFUEL_PRODUCT_TYPE,
    clientcode: member.id.replace(/-/g, "").slice(0, 15),
    applicationtype: process.env.MIFUEL_APPLICANT_TYPE ?? "2",
    identificationtype: member.id_type === "passport" ? "2" : "1",
    identificationnumber: member.id_number,
    title: member.title,
    name: member.first_name,
    surname: member.surname,
    mobilenumber: member.cell_number,
    emailaddress: member.email,
    dateofbirth: member.date_of_birth,
    membertype: "00",
    mainmember: "",
    nationality: member.nationality ?? "South Africa",
    // "new" for first contact, blank for updates, per the guide.
    requesttype: member.mifuel_userid ? "" : "new",
  };

  try {
    const res = await fetch(`${baseUrl()}/api/v2/member.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.json();
    // Their responses arrive as a single-element array.
    const data: MifuelMemberResponse = Array.isArray(raw) ? raw[0] : raw;

    const ok = res.ok && (data.success === 1 || data.success === true);
    const now = new Date().toISOString();

    if (!ok) {
      const message = String(data.message ?? `HTTP ${res.status}`).slice(0, 300);
      await db.from("member").update({ mifuel_last_error: message, updated_at: now }).eq("id", member.id);
      console.error("MiFuel provisioning refused", message);
      return { ok: false, error: "refused" };
    }

    await db
      .from("member")
      .update({
        mifuel_userid: data.userid != null ? String(data.userid) : member.mifuel_userid,
        mifuel_productlinkid: data.productlinkid != null && String(data.productlinkid) !== "0"
          ? String(data.productlinkid)
          : undefined,
        mifuel_provisioned_at: now,
        mifuel_last_error: null,
        updated_at: now,
      })
      .eq("id", member.id);

    return { ok: true };
  } catch (err) {
    console.error("MiFuel provisioning failed", err);
    await db
      .from("member")
      .update({ mifuel_last_error: String(err).slice(0, 300) })
      .eq("id", memberId);
    return { ok: false, error: "network" };
  }
}

/**
 * Product link status sync (their productstatus.php): Inactive 0,
 * Pending 1, Active 2, Suspended 3, Cancelled 4, Terminated 5. Used by
 * the admin suspension toggle; best effort, never blocking the local
 * action.
 */
export async function syncMifuelStatus(
  memberId: string,
  status: 0 | 1 | 2 | 3 | 4 | 5,
  reason: string
): Promise<void> {
  if (!mifuelConfigured()) return;
  const db = createSvcClient();
  const { data: member } = await db
    .from("member")
    .select("mifuel_productlinkid")
    .eq("id", memberId)
    .maybeSingle();
  if (!member?.mifuel_productlinkid) return;

  try {
    await fetch(`${baseUrl()}/api/v2/productstatus.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgid: process.env.MIFUEL_ORG_ID,
        key: process.env.MIFUEL_API_KEY,
        productlinkid: member.mifuel_productlinkid,
        status: String(status),
        reason: reason.slice(0, 25),
      }),
    });
  } catch (err) {
    console.error("MiFuel status sync failed", err);
  }
}
