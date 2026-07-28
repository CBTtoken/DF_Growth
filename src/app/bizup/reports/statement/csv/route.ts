import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { loadStatement, resolvePeriod } from "@/lib/bizup/reports";
import { toCsv, csvAmount, csvResponse } from "@/lib/bizup/csv";
import { bizupLoginPath } from "@/lib/bizup/product";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan, financial_year_end_month")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!account) return new Response("Not found", { status: 404 });
  if (!capabilitiesFor(account.plan as BizUpPlan).clientStatements) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer");
  if (!customerId) return new Response("Not found", { status: 404 });

  const period = resolvePeriod(
    url.searchParams.get("period") ?? undefined,
    account.financial_year_end_month,
    { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined },
  );

  // loadStatement scopes the customer to the account, so a guessed uuid
  // from another member's account returns null rather than their data.
  const statement = await loadStatement(account.id, customerId, period);
  if (!statement) return new Response("Not found", { status: 404 });

  const rows = statement.lines.map((l) => [
    l.date,
    l.kind === "payment" ? "Payment" : l.kind === "credit_note" ? "Credit note" : "Invoice",
    l.reference,
    csvAmount(l.amountCents),
    csvAmount(l.runningBalanceCents),
  ]);

  rows.push(["", "", "Balance owing", csvAmount(statement.closingBalanceCents), ""]);

  const csv = toCsv(["Date", "Type", "Reference", "Amount", "Running balance"], rows);
  const safeName = statement.customer.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return csvResponse(`statement-${safeName}-${period.from}-to-${period.to}.csv`, csv);
}
