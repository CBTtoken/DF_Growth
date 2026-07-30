import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { csvResponse } from "@/lib/bizup/csv";
import { ordersToCsv, type ExportableOrder } from "@/lib/orders/export";

// Downloads the seller's orders as a spreadsheet.
//
// Scoped to the signed-in seller's own growth_client_id, derived server
// side, never taken from the request. This runs as the service role, which
// bypasses row level security, so the filter here is the only thing
// standing between one seller and another seller's customer addresses.
//
// Two optional filters, both useful in practice:
//   ?batch=3        everything in one print run, which is what a printer
//                   and a courier are each given
//   ?unfulfilled=1  everything paid and not yet shipped, which is what you
//                   look at when deciding what the next run contains
export async function GET(request: Request) {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) {
    return new Response("Not signed in", { status: 401 });
  }

  const url = new URL(request.url);
  const batchParam = url.searchParams.get("batch");
  const unfulfilledOnly = url.searchParams.get("unfulfilled") === "1";

  const admin = createAdminClient();
  let query = admin
    .from("shop_orders")
    .select(
      "created_at, customer_name, customer_email, customer_phone, line_items, total_cents, payment_status, fulfilment_status, batch_number, delivery_address"
    )
    .eq("growth_client_id", client.id)
    // Unpaid orders are deliberately excluded. Nothing gets printed or
    // couriered for money that has not arrived, and putting them in the
    // same file as real orders is how one accidentally gets shipped.
    .eq("payment_status", "paid")
    .order("created_at", { ascending: true });

  if (batchParam) {
    const batch = Number(batchParam);
    if (!Number.isInteger(batch) || batch < 1) {
      return new Response("Invalid batch", { status: 400 });
    }
    query = query.eq("batch_number", batch);
  }

  if (unfulfilledOnly) {
    query = query.neq("fulfilment_status", "shipped");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Order export failed", error);
    return new Response("Could not build the export", { status: 500 });
  }

  const orders = (data ?? []) as unknown as ExportableOrder[];

  const suffix = batchParam
    ? `batch-${batchParam}`
    : unfulfilledOnly
      ? "unfulfilled"
      : "all";
  const filename = `orders-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;

  return csvResponse(filename, ordersToCsv(orders));
}
