"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export type ReportState = { success?: boolean; error?: string } | null;

// CLAUDE.md standing rule: every anonymous form gets a Turnstile check, no
// exceptions. This one is anonymous by definition -- the whole point of
// the anonymous browse layer is that nobody needs an account to report a
// listing that looks wrong.
export async function reportCandidate(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return { error: "Something went wrong. Please try again." };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-report:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: "Too many reports, please wait a few minutes and try again." };
  }

  const human = await verifyTurnstileToken(
    String(formData.get("turnstileToken") ?? ""),
    ip,
    "JOBS_TURNSTILE_SECRET_KEY",
  );
  if (!human) return { error: "We could not confirm you are a person. Please try again." };

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const admin = createAdminClient();

  const { error } = await admin.from("jobs_reports").insert({
    target_type: "candidate",
    target_id: candidateId,
    reason: reason || null,
  });

  if (error) {
    console.error("Failed to record jobs report", error);
    return { error: "Could not send that report. Please try again." };
  }

  return { success: true };
}
