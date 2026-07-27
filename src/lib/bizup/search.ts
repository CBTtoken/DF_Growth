// Building a PostgREST `or=(...)` filter safely.
//
// Found by testing rather than by reading: PostgREST parses the contents
// of an or() filter as a comma-delimited logic tree, so a search term
// containing a comma splits the filter apart and the whole request fails
// with a parse error. "Smith, J" is an entirely ordinary thing to type
// into a customer search, and the failure mode was silent, the page simply
// showed "no customers match" because the error was never inspected.
//
// Wrapping the pattern in double quotes makes PostgREST treat it as a
// single literal. Verified against the real API with commas, parentheses,
// full stops, embedded double quotes and a literal percent sign.

/** Characters that must be escaped inside a PostgREST double-quoted value. */
function quoteValue(pattern: string): string {
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * A case-insensitive "contains" match across several columns, for the
 * `.or()` of a Supabase query.
 *
 * Returns null for a blank term, so a caller can skip filtering entirely
 * rather than searching for an empty string and matching every row.
 */
export function ilikeAcross(columns: string[], term: string): string | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  const quoted = quoteValue(`%${trimmed}%`);
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}
