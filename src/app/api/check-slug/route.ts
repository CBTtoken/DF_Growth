import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

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

  const admin = createAdminClient();
  const { data: existing } = await admin.from("growth_clients").select("id").eq("slug", slug).maybeSingle();

  return NextResponse.json({ available: !existing, slug });
}
