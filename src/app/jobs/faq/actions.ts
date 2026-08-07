"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendEmail } from "@/lib/email/resend";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";

// Where these land. A real inbox, never an invented address.
const ADMIN_NOTIFY_EMAIL = "info@digitalflyer.co.za";

export type JobsQuestionState = { error?: string; success?: boolean } | null;

/**
 * The questions and suggestions form, Dewald's ask for launch: "we are new,
 * should we add something about that because it is all empty once we go
 * public. Maybe a form to submit suggestions or ask questions?"
 *
 * It writes into homepage_inquiries with source 'jobs' rather than a new
 * table of its own. The admin Support inbox already reads that table and
 * already has read, reply, archive and delete built on it; a second inbox
 * nobody remembers to open is worse than no inbox.
 *
 * A stranger can post to this without logging in, so per CLAUDE.md it
 * verifies a Turnstile token server-side before it does anything, and the
 * form renders the widget. The rate limit stays, but it is not the gate: it
 * lives in one serverless instance's memory and resets on every cold start.
 */
export async function submitJobsQuestion(
  _prev: JobsQuestionState,
  formData: FormData,
): Promise<JobsQuestionState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`jobs-question:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: "You have sent a few already. Please wait a few minutes and try again." };
  }

  const human = await verifyTurnstileToken(
    String(formData.get("turnstileToken") ?? ""),
    ip,
    "JOBS_TURNSTILE_SECRET_KEY",
  );
  if (!human) {
    return { error: "We could not confirm you are a person. Please reload the page and try again." };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);
  const rawMessage = String(formData.get("message") ?? "").trim().slice(0, 2000);

  if (name.length < 2) return { error: "Please tell us your name so we know who we are replying to." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please check your email address, we need it to reply to you." };
  }
  if (rawMessage.length < 5) return { error: "Please tell us what you would like to ask or suggest." };

  // Same auto-strip as every free-text field in Jobs. Somebody asking for
  // help with their CV will paste their CV in here, ID number and all.
  const message = sanitizeFreeText(rawMessage).text;

  const admin = createAdminClient();
  const { error } = await admin.from("homepage_inquiries").insert({
    name,
    email,
    message,
    source: "jobs",
  });

  if (error) {
    console.error("Failed to save jobs question", error);
    return { error: "We could not send that. Please try again in a moment." };
  }

  // Best effort: it is already saved and already in the Support inbox, so a
  // failed notification must never tell the sender their message failed.
  try {
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `KatisoBiz Jobs question: ${name}`,
      html: `
        <p>Good day,</p>
        <p>Somebody sent a question or suggestion through KatisoBiz Jobs.</p>
        <p><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
        <p>See it in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/support">Support tab</a>.</p>
      `,
    });
  } catch (err) {
    console.error("Jobs question notification email failed", err);
  }

  return { success: true };
}
