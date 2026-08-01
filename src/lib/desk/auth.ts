import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The Desk is single user. There is no signup, no invite and no second
// account: the gate is one email address, checked against the Supabase
// session on every screen and on the export endpoint.
//
// DESK_EMAIL keeps that address out of the code. It falls back to the first
// entry in ADMIN_EMAILS so the tool works on a fresh environment without one
// more variable to set, and to the operator's own address after that.
export function deskEmail(): string {
  const explicit = process.env.DESK_EMAIL?.trim();
  if (explicit) return explicit.toLowerCase();

  const firstAdmin = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
  if (firstAdmin) return firstAdmin.toLowerCase();

  return "info@digitalflyer.co.za";
}

// Returns the signed-in email, or redirects to the login screen. Every page
// under /desk calls this, so a request without a session gets a login prompt
// rather than content.
export async function requireDeskUser(): Promise<string> {
  const email = await deskUserOrNull();
  if (!email) redirect("/desk/login");
  return email;
}

// The same check without the redirect, for route handlers that answer with a
// status code instead of a page.
export async function deskUserOrNull(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email || email !== deskEmail()) return null;
  return email;
}
