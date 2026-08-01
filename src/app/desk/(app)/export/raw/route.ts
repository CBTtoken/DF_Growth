import { deskUserOrNull } from "@/lib/desk/auth";
import { buildExport } from "@/lib/desk/export";

// The same output as the Export screen, as plain text, behind the same
// session. A route handler is not covered by the layout's gate, so it checks
// for itself.
export const dynamic = "force-dynamic";

export async function GET() {
  const email = await deskUserOrNull();
  if (!email) {
    return new Response("Not signed in.\n", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const markdown = await buildExport();

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
