"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";
import { DESIGN_TOKENS, type DesignSettings } from "@/lib/emag/design";
import { fontByKey, type FontRole } from "@/lib/emag/fonts";

// Saving a publication's own design values.
//
// Only the keys the token list knows about are written, and each is clamped
// to its own range. The values arrive from a browser, so a hand-crafted
// request could otherwise set body text to 900pt and produce an edition of
// several thousand pages, which the flatplan would then faithfully number.

export async function saveDesign(publicationId: string, incoming: DesignSettings) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const clean: DesignSettings = {};

  for (const token of DESIGN_TOKENS) {
    const value = incoming[token.key];
    if (value === undefined || value === null || value === "") continue;

    if (token.unit === "colour") {
      const text = String(value).trim();
      // A colour is six or three hex digits. Anything else is rejected
      // rather than corrected, because a half-valid colour silently falls
      // back to the browser's default and the page looks broken for a
      // reason nobody can see.
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) continue;
      clean[token.key] = text;
      continue;
    }

    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const min = token.min ?? 0;
    const max = token.max ?? 1000;
    clean[token.key] = Math.min(max, Math.max(min, n));
  }

  // The three typefaces. Each is put through fontByKey, which returns the
  // default for anything it does not recognise, so an unknown name cannot
  // reach the page and leave it rendering in whatever the browser feels
  // like. A key that already matches the default is simply not stored.
  for (const role of ["display", "body", "label"] as FontRole[]) {
    const chosen = incoming[`font_${role}`];
    if (!chosen) continue;
    const resolved = fontByKey(String(chosen), role);
    if (resolved.key === String(chosen)) clean[`font_${role}`] = resolved.key;
  }

  const { error } = await supabase
    .from("emag_publications")
    .update({ design: clean, updated_at: new Date().toISOString() })
    .eq("id", publicationId);

  if (error) throw new Error(`Could not save the settings: ${error.message}`);

  // Every screen that draws a page reads these, so they all have to be
  // rebuilt rather than just this one.
  revalidatePath("/bizup/kwaaipress/moxie", "layout");
}

export async function saveIdentity(publicationId: string, fields: Record<string, string>) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_publications")
    .update({
      name: fields.name?.trim() || undefined,
      tagline: fields.tagline?.trim() ?? null,
      definition: fields.definition?.trim() ?? null,
      site: fields.site?.trim() ?? null,
      contact: fields.contact?.trim() ?? null,
      footer_credit: fields.footerCredit?.trim() ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", publicationId);

  if (error) throw new Error(`Could not save: ${error.message}`);
  revalidatePath("/bizup/kwaaipress/moxie", "layout");
}
