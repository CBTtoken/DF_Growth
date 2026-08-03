import { NextResponse } from "next/server";
import { readersDrilldown, requirePublisher } from "@/lib/moxie/admin";

// The readers list as a file, honouring the same filter the screen shows.
// Publisher-only for the same reason the members export is: a list of
// addresses can be requested directly by URL, so the check lives here.
export async function GET(request: Request) {
  const publisher = await requirePublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const filter = new URL(request.url).searchParams.get("filter") ?? "all";
  const people = (await readersDrilldown()).filter((p) => {
    switch (filter) {
      case "never_paid":
        return p.membership === "never paid";
      case "members":
        return p.membership === "active" || p.membership === "past_due";
      case "reading":
        return p.reads > 0;
      default:
        return true;
    }
  });

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["email", "standing", "reads", "last_read", "known_since"].join(","),
    ...people.map((p) =>
      [escape(p.email), escape(p.membership), String(p.reads), escape(p.lastReadAt ?? ""), escape(p.since)].join(",")
    ),
  ];

  return new NextResponse(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moxie-readers-${filter}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
