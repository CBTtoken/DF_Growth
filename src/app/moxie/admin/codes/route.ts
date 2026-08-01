import { NextResponse } from "next/server";
import { codesForEdition, requirePublisher } from "@/lib/moxie/admin";
import { getEdition } from "@/lib/moxie/editions";

// The CSV export of an edition's access codes.
//
// A route handler rather than a page, because the browser has to receive a
// file. The publisher check is repeated here and is not redundant: this URL
// can be requested directly, and it returns every code for an edition, which
// is the one piece of data on this site worth taking.
export async function GET(request: Request) {
  const publisher = await requirePublisher();
  if (!publisher) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const slug = new URL(request.url).searchParams.get("edition");
  if (!slug) return NextResponse.json({ error: "No edition" }, { status: 400 });

  const edition = await getEdition(slug);
  if (!edition) return NextResponse.json({ error: "Unknown edition" }, { status: 404 });

  const codes = await codesForEdition(edition.id);

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["code", "status", "batch", "redeemed_at"].join(","),
    ...codes.map((c) =>
      [
        escape(c.code),
        escape(c.status),
        escape(c.batch_label ?? ""),
        escape(c.redeemed_at ?? ""),
      ].join(",")
    ),
  ];

  return new NextResponse(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moxie-${edition.slug}-codes.csv"`,
      // Never stored by a proxy or the browser. This is a list of live
      // access codes, not a page.
      "Cache-Control": "no-store",
    },
  });
}
