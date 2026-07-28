// CSV writing for KatisoBiz exports.
//
// Sec 12: "CSV is mandatory, not optional. Accountants open everything in
// Excel." So this has to survive Excel, not just be technically valid.
//
// Two things here exist purely because of Excel and neither is optional:
// the BOM, and the leading-character guard.

/** Escapes one field: quotes it and doubles any internal quote. */
function field(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // A value starting with one of these is treated as a formula by Excel and
  // Google Sheets. A customer called "=Smith" or a reference beginning with
  // a minus would execute rather than display, which is both wrong and a
  // known spreadsheet injection route. Prefixing a single quote makes Excel
  // show the literal text.
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(field).join(","), ...rows.map((r) => r.map(field).join(","))];
  // CRLF because that is what Excel expects, and a UTF-8 BOM so that
  // Afrikaans and isiZulu characters in a customer's name are not mangled
  // into mojibake when the accountant opens it.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Cents to a plain decimal string. No currency symbol, no thousands separator: this goes into a spreadsheet column that must be summable. */
export function csvAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // These contain a member's customer list. Never cached by a proxy.
      "Cache-Control": "no-store",
    },
  });
}
