import type { Metadata } from "next";
import { svcCanonical } from "@/lib/svc/host";
import { sendContactMessage } from "./actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask Smart Value Club anything about membership, coupons or your account.",
  alternates: { canonical: svcCanonical("/contact") },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <section className="bg-svc-green px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">Contact us</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            A real person reads every message. Ask about membership, coupons,
            the draw, or anything else.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-xl">
          {params.sent ? (
            <div className="border-2 border-svc-green bg-white/60 p-6">
              <h2 className="font-svc-heading text-lg font-bold text-svc-green">Message sent</h2>
              <p className="mt-2 text-base leading-relaxed">
                Thank you. We will come back to you on the email address you
                gave us.
              </p>
            </div>
          ) : (
            <form action={sendContactMessage} className="space-y-5">
              {params.error && (
                <p className="border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
                  {params.error === "missing" && "Please fill in your name, email and message."}
                  {params.error === "verify" && "The security check did not pass. Please try again."}
                  {params.error === "slow" && "That is a few messages in a row. Give it a couple of minutes and try again."}
                  {params.error === "failed" && "Sorry, sending failed on our side. Please try again a little later."}
                </p>
              )}
              <div>
                <label htmlFor="name" className={svcLabel}>Your name</label>
                <input id="name" name="name" type="text" required autoComplete="name" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="email" className={svcLabel}>Email address</label>
                <input id="email" name="email" type="email" required autoComplete="email" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="message" className={svcLabel}>Your message</label>
                <textarea id="message" name="message" required rows={6} className={`mt-2 ${svcInput}`} />
              </div>
              <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_SVC_TURNSTILE_SITE_KEY} />
              <button type="submit" className={svcBtnGreen}>
                Send message
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
