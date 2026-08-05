import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

// Slip management (BizUp/docs/HANDOFF-slip-management.md).
//
// A member photographs an expense slip, this file reads it into suggested
// fields, and the member confirms every one of them before anything is
// treated as fact. The OCR output is a SUGGESTION and is never presented
// as truth: the review screen shows every field editable, and a slip only
// becomes `reviewed` when the member acts on it.

export const SLIPS_BUCKET = "bizup-slips";

// The bucket caps uploads at 5MB; the client compresses to well under 1MB
// first, so hitting this means compression failed on an enormous original.
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Haiku first for cost, per the handoff. Step up only if accuracy on real
// till slips demands it.
const OCR_MODEL = "claude-haiku-4-5-20251001";

export interface SlipRow {
  id: string;
  account_id: string;
  storage_path: string | null;
  slip_date: string | null;
  supplier: string | null;
  description: string | null;
  amount_cents: number;
  vat_amount_cents: number | null;
  allocation: "business" | "personal" | null;
  status: "captured" | "reviewed" | "exported" | "purged";
  captured_at: string;
  exported_at: string | null;
  purged_at: string | null;
}

interface OcrSuggestion {
  slipDate: string | null;
  supplier: string | null;
  description: string | null;
  amountCents: number | null;
  vatAmountCents: number | null;
  raw: unknown;
}

/**
 * Reads a slip image into suggested fields. Best-effort by design: a
 * failed or absent OCR still leaves the member with the photo saved and
 * empty fields to fill in by hand, which is exactly what the product was
 * before this feature existed.
 */
async function ocrSlip(bytes: Uint8Array, mediaType: string): Promise<OcrSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: OCR_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                data: Buffer.from(bytes).toString("base64"),
              },
            },
            {
              type: "text",
              text:
                "This is a photo of a South African expense slip or till receipt. " +
                "Read it and reply with ONLY a JSON object, no markdown fences, no " +
                "commentary, in exactly this shape: " +
                '{"slip_date": "YYYY-MM-DD" or null, "supplier": string or null, ' +
                '"description": string or null, "total_rands": number or null, ' +
                '"vat_rands": number or null}. ' +
                "supplier is the shop or business name at the top. description is a " +
                "short summary of what was bought, a few words, not the full item " +
                "list. total_rands is the final total paid. vat_rands is the VAT " +
                "amount ONLY if the slip explicitly shows one; never calculate it " +
                "yourself. If you cannot read a field, use null rather than guessing.",
            },
          ],
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    // Standing memory rule: strip markdown fences before JSON.parse on any
    // LLM output, even though the prompt says not to add them.
    const jsonText = block.text
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);

    const toCents = (v: unknown): number | null =>
      typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
    const toText = (v: unknown, max: number): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const toDate = (v: unknown): string | null =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

    return {
      slipDate: toDate(parsed.slip_date),
      supplier: toText(parsed.supplier, 120),
      description: toText(parsed.description, 300),
      amountCents: toCents(parsed.total_rands),
      vatAmountCents: toCents(parsed.vat_rands),
      raw: parsed,
    };
  } catch (err) {
    console.error("Slip OCR failed", err);
    return null;
  }
}

/**
 * Stores a slip photo and creates its row with OCR-suggested fields.
 *
 * The photo is uploaded first and the OCR runs second, so an OCR failure
 * never loses the image. A slip date the OCR could not find defaults to
 * today, the day the member photographed it, which is right far more often
 * than blank and is editable either way.
 */
export async function captureSlip(
  accountId: string,
  file: unknown,
): Promise<{ error: string } | { id: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Take or choose a photo first." };
  if (!ALLOWED.includes(file.type)) return { error: "Use a photo (JPG, PNG or WEBP)." };
  if (file.size > MAX_SLIP_BYTES) {
    return { error: "That photo is over 5MB. Please try taking it again." };
  }

  const admin = createAdminClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${accountId}/${Date.now()}.${extension}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(SLIPS_BUCKET)
    .upload(path, bytes, { contentType: file.type });
  if (uploadError) {
    console.error("Failed to upload slip photo", uploadError);
    return { error: "Could not save that photo. Please try again." };
  }

  const ocr = await ocrSlip(bytes, file.type);

  const { data: row, error: insertError } = await admin
    .from("bizup_expense_slips")
    .insert({
      account_id: accountId,
      storage_path: path,
      slip_date: ocr?.slipDate ?? new Date().toISOString().slice(0, 10),
      supplier: ocr?.supplier ?? null,
      description: ocr?.description ?? null,
      amount_cents: ocr?.amountCents ?? 0,
      vat_amount_cents: ocr?.vatAmountCents ?? null,
      ocr_raw: ocr?.raw ?? null,
      status: "captured",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to save slip row", insertError);
    // The photo is orphaned without a row; remove it rather than leaving
    // an untracked object in the bucket.
    await admin.storage.from(SLIPS_BUCKET).remove([path]);
    return { error: "Could not save that slip. Please try again." };
  }

  return { id: row.id };
}

/** The member's slips, newest first. */
export async function listSlips(accountId: string): Promise<SlipRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_expense_slips")
    .select("*")
    .eq("account_id", accountId)
    .order("captured_at", { ascending: false })
    .limit(200);
  return (data ?? []) as SlipRow[];
}

/**
 * A short-lived signed URL for one slip photo. The bucket is private and
 * has no read policies, so this is the only way a slip image is ever
 * reachable, and only after the caller has checked ownership.
 */
export async function signedSlipUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(SLIPS_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/**
 * Business slips for an export period.
 *
 * Only slips the member has allocated to business, ever. Personal slips
 * never leave the member's own view, and unallocated ones are not
 * anyone's to include yet.
 */
export async function businessSlipsForPeriod(
  accountId: string,
  from: string,
  to: string,
): Promise<SlipRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_expense_slips")
    .select("*")
    .eq("account_id", accountId)
    .eq("allocation", "business")
    .gte("slip_date", from)
    .lte("slip_date", to)
    .order("slip_date");
  return (data ?? []) as SlipRow[];
}

/**
 * Deletes the images of slips that have just gone out in an accountant
 * export, per the handoff: "once it is exported we clean the db". The row
 * stays forever with status `purged`, so totals and history keep working;
 * only the photo goes. Storage is cleared first and the row updated
 * second, so a failure leaves the slip `exported` with its image intact
 * and the next export retries the purge.
 */
export async function purgeExportedSlips(
  slips: { id: string; storage_path: string | null }[],
): Promise<void> {
  if (slips.length === 0) return;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const withImages = slips.filter((s) => s.storage_path);
  if (withImages.length > 0) {
    const { error } = await admin.storage
      .from(SLIPS_BUCKET)
      .remove(withImages.map((s) => s.storage_path as string));
    if (error) {
      // Mark the rows exported so the export itself is on record, and
      // leave the images for the next export's purge to retry.
      console.error("Slip purge failed, images kept for retry", error);
      await admin
        .from("bizup_expense_slips")
        .update({ status: "exported", exported_at: now })
        .in("id", slips.map((s) => s.id))
        .neq("status", "purged");
      return;
    }
  }

  await admin
    .from("bizup_expense_slips")
    .update({ status: "purged", storage_path: null, exported_at: now, purged_at: now })
    .in("id", slips.map((s) => s.id))
    .neq("status", "purged");
}
