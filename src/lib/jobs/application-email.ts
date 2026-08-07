import { sendEmail } from "@/lib/email/resend";
import { JOBS_ORIGIN } from "@/lib/jobs/host";

/**
 * Telling an employer that somebody has applied.
 *
 * Dewald asked for this ("we can also email it to their registered email
 * address?") and chose the link-only shape over attaching the CV. That
 * choice is load-bearing rather than cosmetic, so it is written down here:
 *
 * /employers promises candidates that "full candidate details only show to
 * registered employers, and every view is recorded". A CV attached to an
 * email is outside that promise the moment it is sent. It cannot be
 * logged, it cannot be withdrawn when somebody deletes their CV, and one
 * forward puts a person's name and mobile number somewhere nobody can see
 * or reach. So the email carries what an employer needs in order to decide
 * whether to look, and looking still happens on a screen that records it.
 *
 * The applicant's own words are the exception and they are included in
 * full: a cover message was written to be read by this employer, and an
 * alert that hides it is an alert that has to be clicked to mean anything.
 *
 * Never throws. A failed alert must not fail the application: the
 * applicant has done nothing wrong, and the application is already saved
 * and already visible on the employer's dashboard.
 */
export async function sendApplicationAlert({
  to,
  employerName,
  applicantName,
  vacancyTitle,
  coverMessage,
  applicationId,
}: {
  to: string;
  employerName: string;
  applicantName: string;
  vacancyTitle: string;
  coverMessage: string | null;
  applicationId: string;
}): Promise<{ ok: boolean }> {
  if (!to) return { ok: false };

  // Always Jobs' own origin, never the hostname the applicant happened to
  // be on: a link into a Vercel preview deployment would be useless in an
  // inbox a week later.
  const applicantUrl = `${JOBS_ORIGIN}/employer/applicants/${applicationId}`;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    const result = await sendEmail({
      to,
      subject: `New applicant for ${vacancyTitle}`,
      html: `
        <p>Good day ${escape(employerName)},</p>
        <p><strong>${escape(applicantName)}</strong> has applied for your ${escape(vacancyTitle)} post on KatisoBiz Jobs.</p>
        ${
          coverMessage
            ? `<p>What they wrote:</p><blockquote style="margin:0;padding:12px 16px;border-left:3px solid #ddd;color:#444;white-space:pre-line;">${escape(coverMessage)}</blockquote>`
            : ""
        }
        <p>Their full CV is on your dashboard:</p>
        <p><a href="${applicantUrl}">Open this applicant</a></p>
        <p style="color:#666;font-size:13px;">We keep CVs behind your login rather than attaching them, so the people listing themselves can see who has looked at their details. Never ask a candidate to pay for anything.</p>
        <p>DigitalFlyer SA</p>
      `,
    });
    return { ok: result.ok };
  } catch (err) {
    console.error("Failed to send application alert", err);
    return { ok: false };
  }
}
