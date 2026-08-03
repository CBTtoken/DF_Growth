"use server";

import { revalidatePath } from "next/cache";
import { requireDeskUser } from "@/lib/desk/auth";
import { runHealthChecks } from "@/lib/desk/health/run";

/**
 * The Run checks button.
 *
 * Behind the single-user gate like every other Desk action, because this
 * reads billing figures, account counts and infrastructure state, which is
 * not a page to leave open.
 */
export async function runChecksNow(): Promise<{ ran: number }> {
  await requireDeskUser();
  const results = await runHealthChecks();
  revalidatePath("/desk/health");
  return { ran: results.length };
}
