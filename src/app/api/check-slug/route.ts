import { NextResponse } from "next/server";
import { slugify } from "@/lib/slugify";
import { checkSlugAvailable } from "@/lib/slug-namespace";

// Found via a real stress test: two businesses picking the same name used
// to silently strand the second one after payment (fixed server-side in the
// webhook, see paystack/route.ts). This closes the loop at the point of
// entry instead — telling the visitor before they pay, rather than relying
// entirely on the backend's auto-disambiguation as a safety net.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessName = searchParams.get("name")?.trim() ?? "";

  if (businessName.length < 2) {
    return NextResponse.json({ available: null });
  }

  const slug = slugify(businessName);
  if (!slug) {
    return NextResponse.json({ available: null });
  }

  // Public Beta Polish Sprint Sec 13.2: matches provisionGrowthClient's own
  // reserved-word handling — a reserved slug will always get suffixed at
  // signup, so showing it as "available" here would be misleading.
  //
  // Agent Programme Phase 1 Sec 1.2: checkSlugAvailable replaces what used
  // to be a reserved-word check plus a single growth_clients lookup, so
  // this now tells the truth about the whole shared namespace, including
  // live agent pages and former business slugs that still redirect.
  const result = await checkSlugAvailable(slug);

  return NextResponse.json({ available: !result.taken, slug });
}
