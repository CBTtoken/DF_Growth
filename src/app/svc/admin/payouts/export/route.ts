import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";

// The payout month as CSV (handoff 7.3). Same shape as the screen: payee,
// type, source, count, rate, amount, paid state.
export async function GET(request: Request) {
  const admin = await getSvcAdmin();
  if (!admin) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}-01$/.test(period)) return new Response("Bad period", { status: 400 });

  const db = createSvcClient();
  const { data: lines } = await db
    .from("payout_line")
    .select(
      "payee_type, source, item_count, rate_cents, amount_cents, paid_at, paid_reference, partner:partner_id (name), member:member_id (first_name, surname, cell_number)"
    )
    .eq("period", period)
    .order("payee_type");

  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const rows = [
    ["payee", "type", "source", "count", "rate_rand", "amount_rand", "paid_at", "paid_reference"].join(","),
    ...(lines ?? []).map((l) => {
      const partner = l.partner as unknown as { name: string } | null;
      const member = l.member as unknown as { first_name: string; surname: string; cell_number: string } | null;
      const payee = partner?.name ?? (member ? `${member.first_name} ${member.surname} (${member.cell_number})` : "");
      return [
        esc(payee),
        l.payee_type,
        esc(l.source),
        l.item_count,
        l.rate_cents != null ? (l.rate_cents / 100).toFixed(2) : "",
        (l.amount_cents / 100).toFixed(2),
        l.paid_at ?? "",
        esc(l.paid_reference),
      ].join(",");
    }),
  ];

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="svc-payouts-${period.slice(0, 7)}.csv"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
