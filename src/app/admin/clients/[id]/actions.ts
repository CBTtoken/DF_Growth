"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { sendEmail } from "@/lib/email/resend";
import { initializePaystackCheckout } from "@/lib/paystack/checkout";
import { planCodeForTier, type Tier, type BillingInterval } from "@/lib/paystack/plans";
import { step1Schema, step2Schema, step3Schema, templateSchema, step5Schema, step6Schema } from "@/lib/schemas/intake";
import { captureAndStoreScreenshot } from "@/lib/screenshot/capture-and-store";

type MarketplaceUrlState = { error?: string; success?: boolean } | null;
type PlanControlState = { error?: string; success?: boolean } | null;
type BuilderState = { error?: string; success?: boolean } | null;
const VALID_TIERS: Tier[] = ["foundation", "growth_engine", "enterprise"];

// Admin-built page — Dewald's exact ask: some prospects just hand over
// access/content and want DigitalFlyer to build the whole page for them,
// without ever touching the self-serve /onboard wizard. These mirror
// onboard/actions.ts's saveStepN writes field-for-field (same zod schemas,
// same columns) but gated by requireAdminEmail() with an explicit clientId
// from the form, instead of requireGrowthClientId()'s own-session
// resolution — deliberately separate from the live client-facing actions
// so nothing here can affect a real client's own onboarding/edit flow.
// Logo and photo upload aren't covered yet (Storage handling, out of scope
// for this pass) — flagged as a known gap, not silently left out.
function fd(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function adminSaveBusinessInfo(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const parsed = step1Schema.safeParse({
    businessName: fd(formData, "businessName"),
    contactEmail: fd(formData, "contactEmail"),
    callPhone: fd(formData, "callPhone"),
    whatsappPhone: fd(formData, "whatsappPhone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({
      business_name: parsed.data.businessName,
      contact_email: parsed.data.contactEmail,
      call_phone: parsed.data.callPhone || null,
      whatsapp_phone: parsed.data.whatsappPhone || null,
    })
    .eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function adminSaveBusinessProfile(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const parsed = step2Schema.safeParse({
    province: fd(formData, "province"),
    industry: fd(formData, "industry"),
    businessAddress: fd(formData, "businessAddress"),
    city: fd(formData, "city"),
    businessDescription: fd(formData, "businessDescription"),
    tagline: fd(formData, "tagline"),
    productsServices: fd(formData, "productsServices"),
    additionalNotes: fd(formData, "additionalNotes"),
    facebookUrl: fd(formData, "facebookUrl"),
    instagramUrl: fd(formData, "instagramUrl"),
    websiteUrl: fd(formData, "websiteUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({
      province: parsed.data.province,
      industry: parsed.data.industry,
      business_address: parsed.data.businessAddress,
      city: parsed.data.city || null,
      business_description: parsed.data.businessDescription,
      tagline: parsed.data.tagline || null,
      products_services: parsed.data.productsServices || null,
      additional_notes: parsed.data.additionalNotes || null,
      facebook_url: parsed.data.facebookUrl || null,
      instagram_url: parsed.data.instagramUrl || null,
      website_url: parsed.data.websiteUrl || null,
    })
    .eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function adminSaveBrandKit(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const parsed = step3Schema.safeParse({
    brandPrimaryColor: fd(formData, "brandPrimaryColor"),
    brandSecondaryColor: fd(formData, "brandSecondaryColor"),
  });
  if (!parsed.success) return { error: "Colours should be a hex code, e.g. #1081b8." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ brand_primary_color: parsed.data.brandPrimaryColor, brand_secondary_color: parsed.data.brandSecondaryColor })
    .eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function adminSaveTemplate(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const parsed = templateSchema.safeParse({ template: fd(formData, "template") });
  if (!parsed.success) return { error: "Invalid template." };

  const admin = createAdminClient();
  const { error } = await admin.from("growth_clients").update({ template: parsed.data.template }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// Mirrors saveStep5's upsert-on-(growth_client_id, slug) shape exactly —
// needs the client's slug, passed through as a hidden field since this
// action has no session to derive it from.
export async function adminSaveLandingCopy(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  const slug = fd(formData, "slug");
  if (!clientId || !slug) return { error: "Missing client." };

  const parsed = step5Schema.safeParse({
    headline: fd(formData, "headline"),
    subheadline: fd(formData, "subheadline"),
    aboutText: fd(formData, "aboutText"),
    servicesText: fd(formData, "servicesText"),
    ctaLabel: fd(formData, "ctaLabel"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const admin = createAdminClient();
  const { data: growthClient } = await admin.from("growth_clients").select("status").eq("id", clientId).single();
  const { error } = await admin.from("landing_pages").upsert(
    {
      growth_client_id: clientId,
      slug,
      headline: parsed.data.headline,
      subheadline: parsed.data.subheadline,
      about_text: parsed.data.aboutText,
      services_text: parsed.data.servicesText || null,
      cta_label: parsed.data.ctaLabel,
      published: growthClient?.status === "active",
    },
    { onConflict: "growth_client_id,slug" }
  );
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function adminSavePackages(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const parsed = step6Schema.safeParse({
    package1Type: fd(formData, "package1Type") || undefined,
    package1Name: fd(formData, "package1Name"),
    package1Price: fd(formData, "package1Price"),
    package1Description: fd(formData, "package1Description"),
    package2Type: fd(formData, "package2Type") || undefined,
    package2Name: fd(formData, "package2Name"),
    package2Price: fd(formData, "package2Price"),
    package2Description: fd(formData, "package2Description"),
    package3Type: fd(formData, "package3Type") || undefined,
    package3Name: fd(formData, "package3Name"),
    package3Price: fd(formData, "package3Price"),
    package3Description: fd(formData, "package3Description"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const packages = [1, 2, 3]
    .map((n) => ({
      type: parsed.data[`package${n}Type` as "package1Type"] ?? "package",
      name: parsed.data[`package${n}Name` as "package1Name"] ?? "",
      price: parsed.data[`package${n}Price` as "package1Price"] ?? "",
      description: parsed.data[`package${n}Description` as "package1Description"] ?? "",
    }))
    .filter((p) => p.name);

  const admin = createAdminClient();
  const { error } = await admin.from("growth_clients").update({ packages }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// Sec 3 of the "register, we build it, they pay when ready" flow: admin
// picks a plan and interval, this generates the exact same Paystack
// checkout link the real self-serve flow would (initializePaystackCheckout
// — same helper /api/checkout/finish and the WhatsApp payment step use, so
// the webhook's charge.success handling activates this account identically
// whichever way the link was reached), and emails it directly rather than
// redirecting a browser to it.
export async function sendPaymentLink(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  const tier = fd(formData, "tier") as Tier;
  const interval = (fd(formData, "interval") || "monthly") as BillingInterval;
  if (!clientId) return { error: "Missing client." };
  if (!VALID_TIERS.includes(tier) || tier === "enterprise") return { error: "Invalid plan." };

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("growth_clients")
    .select("business_name, contact_email")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Client not found." };
  if (!client.contact_email) return { error: "This client has no email on file yet." };

  try {
    planCodeForTier(tier, interval);
  } catch {
    return { error: "That plan isn't configured in Paystack yet." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const result = await initializePaystackCheckout({
    growthClientId: clientId,
    email: client.contact_email,
    tier,
    interval,
    callbackUrl: `${siteUrl}/pricing/success`,
  });
  if ("error" in result) return { error: "Could not create a payment link, please try again." };

  const planLabel = tier === "growth_engine" ? "Growth" : "Foundation";
  const emailResult = await sendEmail({
    to: client.contact_email,
    subject: "Your DigitalFlyer payment link",
    html: `
      <p>Good day ${client.business_name},</p>
      <p>Your DigitalFlyer page is ready. When you're ready to go live, click below to add payment for the ${planLabel} plan:</p>
      <p><a href="${result.authorizationUrl}">Complete payment</a></p>
      <p>Any questions, just reply to this email.</p>
    `,
  });
  if (!emailResult.ok) return { error: "Payment link created, but the email failed to send. Please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// Public Beta Polish Sprint Sec 11: the only writer of growth_clients.
// marketplace_url anywhere in this codebase — deliberately admin-only,
// never exposed to a client during onboarding or in their own dashboard.
// Empty input clears the field back to null (matches Section 11's "never
// auto-generate a link" rule — an unset listing must render as unset, not
// a stale/guessed URL).
export async function setMarketplaceUrl(
  _prevState: MarketplaceUrlState,
  formData: FormData
): Promise<MarketplaceUrlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const marketplaceUrl = formData.get("marketplaceUrl");

  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client." };
  }
  if (typeof marketplaceUrl !== "string") {
    return { error: "Invalid value." };
  }

  const trimmed = marketplaceUrl.trim();
  if (trimmed && !/^https?:\/\/.+/.test(trimmed)) {
    return { error: "Should be a full link, e.g. https://digitalflyer.co.za/listing/..." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ marketplace_url: trimmed || null })
    .eq("id", clientId);

  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// Real gap found live: admin had no way to take a live page down (a test
// signup was showing up on /marketplace with no way to hide or remove it)
// short of a direct database query. Reuses the "cancelled" status value
// self-serve cancel (dashboard/actions.ts) already writes — [clientSlug]/
// page.tsx and every public listing already gate on status === "active",
// so this hides the page the same way a real cancellation does, without
// inventing a second status value nothing else checks. Reversible: calling
// it again on a cancelled account reactivates it.
export async function toggleClientVisibility(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: client } = await admin.from("growth_clients").select("status").eq("id", clientId).single();
  if (!client) return { error: "Client not found." };

  const nextStatus = client.status === "active" ? "cancelled" : "active";
  const { error } = await admin.from("growth_clients").update({ status: nextStatus }).eq("id", clientId);
  if (error) return { error: "Could not update, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/marketplace");
  return { success: true };
}

// Real page screenshot for marketing use ("See It In Action" on
// /pricing) — the weekly cron (src/app/api/cron/refresh-screenshots)
// covers the top-visited clients automatically, this is the manual
// escape hatch for right after a big edit, or for a client the weekly
// sweep hasn't reached yet.
export async function refreshClientScreenshot(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: client } = await admin.from("growth_clients").select("slug").eq("id", clientId).single();
  if (!client?.slug) return { error: "Client not found or has no live page." };

  const result = await captureAndStoreScreenshot(clientId, client.slug);
  if (!result.ok) return { error: result.error ?? "Screenshot capture failed." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/pricing");
  return { success: true };
}

// Direct admin override of the plan value — no Paystack involvement, no
// billing change. Real use: fixing a comped or test account's plan, or
// upgrading a client whose actual subscription is being handled outside
// this flow. Deliberately does NOT touch a real paying client's Paystack
// subscription — if this is used on a genuinely paying account, what they
// see here and what Paystack actually charges them can drift apart, so
// this is meant for admin-comped/test accounts, not as a payment-bypass
// upgrade path for real subscribers.
export async function adminChangePlan(_prevState: PlanControlState, formData: FormData): Promise<PlanControlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const plan = formData.get("plan");
  if (typeof clientId !== "string" || !clientId) return { error: "Missing client." };
  if (typeof plan !== "string" || !VALID_TIERS.includes(plan as Tier)) return { error: "Invalid plan." };

  const admin = createAdminClient();
  const { error } = await admin.from("growth_clients").update({ plan }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// The "let us build their page, test it, then start paying" flow: grants
// free access on any plan for a chosen window (blank = indefinite, admin
// ends it manually), bypassing Paystack entirely. Reuses the exact
// "finish onboarding" mechanics onboard/actions.ts's saveStep6 uses for a
// real trial activation — publish the landing page, send the "your page
// is live" email — but only the first time (a still-pending_intake
// client), so re-granting or extending an already-active comp doesn't
// resend it. trial_ends_at is explicitly cleared, matching is_agent_comped's
// own precedent, so the Foundation trial-reminder cron (which only ever
// looks at rows where trial_ends_at is set) leaves this account alone —
// admin_comp_until is a separate clock, checked by its own cron pass.
export async function grantAdminComp(_prevState: PlanControlState, formData: FormData): Promise<PlanControlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const plan = formData.get("plan");
  const until = formData.get("until");
  const note = formData.get("note");
  if (typeof clientId !== "string" || !clientId) return { error: "Missing client." };
  if (typeof plan !== "string" || !VALID_TIERS.includes(plan as Tier)) return { error: "Invalid plan." };
  if (typeof until !== "string") return { error: "Invalid date." };

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("growth_clients")
    .select("status, slug, business_name, contact_email")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Client not found." };

  const wasNotYetLive = client.status !== "active";
  const untilIso = until ? new Date(`${until}T23:59:59`).toISOString() : null;
  const noteText = typeof note === "string" && note.trim() ? note.trim() : null;

  const { error } = await admin
    .from("growth_clients")
    .update({
      plan,
      status: "active",
      is_admin_comped: true,
      admin_comp_until: untilIso,
      admin_comp_note: noteText,
      trial_ends_at: null,
    })
    .eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  if (wasNotYetLive) {
    await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", clientId);
    if (client.slug) {
      await sendWelcomeEmail({ businessName: client.business_name, contactEmail: client.contact_email, slug: client.slug });
    }
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  return { success: true };
}

// Ends an admin-granted comp early — pauses the account the same way a
// trial's own expiry does (src/app/api/cron/trial-reminders), prompting
// real payment. admin_comp_until/admin_comp_note are left as-is as a
// record of what was granted; only is_admin_comped and status change.
export async function endAdminComp(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ is_admin_comped: false, status: "paused" })
    .eq("id", clientId);
  if (error) return { error: "Could not update, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  return { success: true };
}

// Mirrors saveStep3's logo-upload branch (onboard/actions.ts) and
// uploadClientPhoto/deleteClientPhoto (dashboard/actions.ts) exactly —
// same Storage buckets, same path shape, same 10-photo cap — so a client
// who later gets their own login sees exactly what admin already set up,
// no format mismatch. "so once they take over they have access to it all"
// was the explicit ask this closes.
const PHOTO_CAP = 10;

export async function adminUploadLogo(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return { error: "Choose a logo file." };

  const admin = createAdminClient();
  const ext = logo.name.split(".").pop() || "png";
  const path = `${clientId}/logo.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("client-logos")
    .upload(path, logo, { contentType: logo.type, upsert: true });
  if (uploadError) return { error: "Could not upload logo — try a smaller file (under 2MB) or a different format." };

  const { error } = await admin.from("growth_clients").update({ logo_path: path }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function adminUploadPhoto(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  if (!clientId) return { error: "Missing client." };

  const files = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("client_photos")
    .select("id", { count: "exact", head: true })
    .eq("growth_client_id", clientId);

  let nextPosition = count ?? 0;
  const room = PHOTO_CAP - nextPosition;
  if (room <= 0) return { error: `Already at the ${PHOTO_CAP}-photo limit — delete one first.` };

  let failed = 0;
  for (const photo of files.slice(0, room)) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("client-photos")
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) {
      failed++;
      continue;
    }
    const { error: insertError } = await admin
      .from("client_photos")
      .insert({ growth_client_id: clientId, storage_path: path, position: nextPosition });
    if (insertError) {
      failed++;
      continue;
    }
    nextPosition++;
  }

  revalidatePath(`/admin/clients/${clientId}`);
  if (failed > 0) return { error: `${failed} photo${failed > 1 ? "s" : ""} couldn't be uploaded.` };
  return { success: true };
}

export async function adminDeletePhoto(clientId: string, photoId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("client_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("growth_client_id", clientId)
    .single();
  if (!photo) return { error: "Photo not found." };

  await admin.storage.from("client-photos").remove([photo.storage_path]);
  const { error } = await admin.from("client_photos").delete().eq("id", photoId);
  if (error) return { error: "Could not delete, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// For an admin-created client (adminCreateClient, src/app/admin/clients/
// new/actions.ts) — they never went through a referral link or typed an
// agent's name at signup, so referred_by_agent_id would otherwise stay
// null forever even when an agent genuinely brought this client in. The
// webhook's own commission logic (recordCommissionIfEligible, called from
// src/app/api/webhooks/paystack/route.ts) reads referred_by_agent_id fresh
// off the growth_clients row at payment time, not from signup-time
// metadata — so setting it here, any time before the client's first
// qualifying payment, is enough for commission to flow correctly with no
// other changes needed. Empty agentId clears the assignment.
export async function adminAssignAgent(_prevState: BuilderState, formData: FormData): Promise<BuilderState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = fd(formData, "clientId");
  const agentId = fd(formData, "agentId");
  if (!clientId) return { error: "Missing client." };

  const admin = createAdminClient();

  if (!agentId) {
    const { error } = await admin.from("growth_clients").update({ referred_by_agent_id: null }).eq("id", clientId);
    if (error) return { error: "Could not save, please try again." };
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  }

  const { data: agent } = await admin.from("agents").select("id").eq("id", agentId).eq("status", "approved").single();
  if (!agent) return { error: "That agent isn't approved." };

  const { error } = await admin.from("growth_clients").update({ referred_by_agent_id: agentId }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// Real delete, not a soft-hide — for genuine test/junk accounts (the
// original real case: two throwaway "ABC Group" signups cluttering
// /marketplace). Every child table cascades on growth_client_id except
// whatsapp_conversations (see supabase/migrations/20260712180000_add_
// whatsapp_onboarding.sql — no ON DELETE CASCADE there), so that one needs
// an explicit delete first or the growth_clients delete itself would fail
// on the foreign key. Does not touch Storage objects (logo/photos/
// generated assets) or the linked auth user — a known gap, not silently
// pretended away; a user can own more than one growth_client (see the
// account switcher), so deleting their login here would be wrong.
export async function deleteClient(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  await admin.from("whatsapp_conversations").delete().eq("growth_client_id", clientId);
  const { error } = await admin.from("growth_clients").delete().eq("id", clientId);
  if (error) return { error: "Could not delete, please try again." };

  revalidatePath("/admin");
  revalidatePath("/marketplace");
  redirect("/admin");
}
