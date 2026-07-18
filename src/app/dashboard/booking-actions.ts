"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { bookableUnitSchema, bookingRulesSchema } from "@/lib/schemas/booking";

type ActionState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;
type ActionResult = { error?: string; success?: boolean };

async function revalidateOwnPage(clientId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("growth_clients").select("slug").eq("id", clientId).single();
  revalidatePath("/dashboard");
  if (data?.slug) revalidatePath(`/${data.slug}`);
}

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 1: "a Growth client can
// optionally switch on Booking." Turning it on doesn't require any
// bookable_units to exist yet — a client sees the setup section either way
// once switched on, matching how shop_enabled works independently of
// shop_products existing.
export async function setBookingEnabled(enabled: boolean): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin.from("growth_clients").update({ booking_enabled: enabled }).eq("id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

// Sec 3.4: "Setup uses simple radio-button questions... not a settings-menu
// wall." One bookable unit at a time — id present means edit, absent means
// create, mirroring the same create-or-update-by-presence-of-id pattern
// used for Packages.
export async function saveBookableUnit(
  unitId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  const parsed = bookableUnitSchema.safeParse({
    name: formData.get("name"),
    unitType: formData.get("unitType"),
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"),
    capacity: formData.get("capacity") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const row = {
    growth_client_id: client.id,
    name: parsed.data.name,
    unit_type: parsed.data.unitType,
    description: parsed.data.description || null,
    base_price_cents: Math.round(parsed.data.basePrice * 100),
    capacity: parsed.data.unitType === "capacity" ? (parsed.data.capacity ?? 1) : null,
    duration_minutes: parsed.data.unitType === "time_slot" ? (parsed.data.durationMinutes ?? 30) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = unitId
    ? await admin.from("bookable_units").update(row).eq("id", unitId).eq("growth_client_id", client.id)
    : await admin.from("bookable_units").insert(row);

  if (error) {
    return { error: { _form: ["Could not save — please try again."] } };
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function deleteBookableUnit(unitId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin.from("bookable_units").delete().eq("id", unitId).eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function toggleBookableUnitActive(unitId: string, isActive: boolean): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("bookable_units")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", unitId)
    .eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

// Sec 3.4: operating hours, buffer, min-advance, cancellation policy — one
// row per client (booking_operational_rules.growth_client_id is the primary
// key), upserted rather than insert/update-by-presence since a client
// always has at most one.
export async function saveBookingRules(
  operatingHours: Record<string, { open: string; close: string }[]>,
  reminderOffsetsHours: number[],
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  const parsed = bookingRulesSchema.safeParse({
    bufferMinutes: formData.get("bufferMinutes"),
    minAdvanceHours: formData.get("minAdvanceHours"),
    cancellationPolicyText: formData.get("cancellationPolicyText") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("booking_operational_rules").upsert({
    growth_client_id: client.id,
    operating_hours: operatingHours,
    buffer_minutes: parsed.data.bufferMinutes,
    min_advance_hours: parsed.data.minAdvanceHours,
    cancellation_policy_text: parsed.data.cancellationPolicyText || null,
    reminder_offsets_hours: reminderOffsetsHours,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: { _form: ["Could not save — please try again."] } };
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function confirmReservationManually(reservationId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("reservations")
    .update({ status: "confirmed", hold_expires_at: null, updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function cancelReservation(reservationId: string, reason: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("reservations")
    .update({
      status: "cancelled",
      hold_expires_at: null,
      cancellation_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}
