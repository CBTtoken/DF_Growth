"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { clientIpFromHeaders, isRateLimited } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { svcPath } from "@/lib/svc/host";

/**
 * The SVC contact form.
 *
 * Anonymous form, so it gets the full Turnstile check per the house rule in
 * CLAUDE.md 0.0: the server action verifies the token against Cloudflare
 * before doing anything, and the rate limit stays as a courtesy, not the
 * gate. SVC has its own Turnstile widget and secret because the widget is
 * locked to its hostnames and smartvalueclub.co.za is its own domain.
 *
 * Submissions go out as email rather than into a table: one person runs
 * this company from a laptop, and their inbox is where a question gets
 * answered. SVC_CONTACT_EMAIL is the destination; until it is configured
 * the form reports failure honestly instead of swallowing messages.
 */
export async function sendContactMessage(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();

  const back = await svcPath("/contact");

  if (!name || !email || !message) {
    redirect(`${back}?error=missing`);
  }

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);

  // Five messages per ten minutes per address. Courtesy brake only; the
  // Turnstile check below is the gate.
  if (isRateLimited(`svc-contact:${ip}`, 5, 10 * 60 * 1000)) {
    redirect(`${back}?error=slow`);
  }

  const token = formData.get("turnstileToken");
  const human = await verifyTurnstileToken(
    typeof token === "string" ? token : null,
    ip,
    "SVC_TURNSTILE_SECRET_KEY"
  );
  if (!human) {
    redirect(`${back}?error=verify`);
  }

  const to = process.env.SVC_CONTACT_EMAIL;
  if (!to) {
    console.error("SVC_CONTACT_EMAIL is not configured; contact message not sent");
    redirect(`${back}?error=failed`);
  }

  const { ok, error } = await sendEmail({
    to,
    subject: `SVC contact form: ${name}`,
    fromName: "Smart Value Club",
    replyTo: email,
    html: `
      <p style="font-size:15px;line-height:1.65;margin:0 0 12px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
      <p style="font-size:15px;line-height:1.65;white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
    `,
  });

  if (!ok) {
    console.error("SVC contact email failed", error);
    redirect(`${back}?error=failed`);
  }

  redirect(`${back}?sent=1`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
