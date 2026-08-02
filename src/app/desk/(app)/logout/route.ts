import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign out. A route rather than an action so the More screen can be a plain
// form and nothing on it depends on JavaScript.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/desk/login", request.url), {
    status: 303,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
