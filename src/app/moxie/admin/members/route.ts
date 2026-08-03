import { NextResponse } from "next/server";
import { listMembers, requirePublisher } from "@/lib/moxie/admin";

// The members list as a file, for the owner's own bookkeeping. Same shape
// and same reasoning as the codes export beside it: a route because the
// browser has to receive a file, and the publisher check repeated because
// this URL can be requested directly and it holds every member's address.
export async function GET() {
  const publisher = await requirePublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const members = await listMembers();

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["email", "status", "plan", "joined", "renews", "cancelled"].join(","),
    ...members.map((m) =>
      [
        escape(m.email),
        escape(m.status),
        escape(m.interval),
        escape(m.started_at ?? ""),
        escape(m.current_period_end ?? ""),
        escape(m.cancelled_at ?? ""),
      ].join(",")
    ),
  ];

  return new NextResponse(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moxie-members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
