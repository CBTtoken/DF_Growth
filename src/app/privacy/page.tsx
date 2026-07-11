import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";

// Sprint 1, Build Item 9. Content is final, provided by Dewald 2026-07-11 —
// rendered verbatim, not edited. Only the two bracketed placeholders in the
// original text ([Insert Date], and the Terms page's contact details) were
// filled in with values Dewald confirmed, nothing else changed.
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How DigitalFlyer collects, uses, and protects your personal information under POPIA.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-ink">
            DigitalFlyer Personal Information Protection Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500">Effective Date: 2026/07/11</p>
          <p className="text-sm text-gray-500">Last Updated: 11 July 2026</p>
        </div>

        <p className="text-sm leading-relaxed text-gray-700">
          DigitalFlyer SA (&ldquo;DigitalFlyer&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
          privacy and is committed to protecting your personal information in line with the Protection
          of Personal Information Act (POPIA).
        </p>
        <p className="text-sm leading-relaxed text-gray-700">
          This policy explains what personal information we collect, how we use it, and your rights.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">1. Who We Are</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            DigitalFlyer provides tools that help small and informal South African businesses build a
            professional online presence and generate leads. Our platform includes landing pages, lead
            capture forms, and (on the Growth tier) ad tracking tools.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">2. What Personal Information We Collect</h2>
          <p className="text-sm leading-relaxed text-gray-700">We collect information in two main ways:</p>
          <p className="text-sm font-semibold text-gray-800">From Business Owners (Clients):</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Name, email address, phone number, and business details</li>
            <li>Business address, description, logo, photos, and social media links</li>
            <li>Payment information (processed securely by Paystack — we do not store full card details)</li>
          </ul>
          <p className="text-sm font-semibold text-gray-800">
            From Leads (People who enquire through client pages):
          </p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Name, phone number, email address, suburb/town, and details about the service they need</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700">
            We also collect technical information (IP address, browser type, device) when you visit our
            site or a client&rsquo;s page.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">3. How and Why We Use Your Information</h2>
          <p className="text-sm leading-relaxed text-gray-700">We use your information to:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Provide and improve our service</li>
            <li>Deliver leads to the correct business owner</li>
            <li>Send important service updates and occasional news (you can opt out anytime)</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700">
            We only collect and use the minimum information necessary.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">4. Sharing Your Information</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>We share lead information <strong>only with the business owner</strong> whose page the enquiry came from.</li>
            <li>
              We use trusted service providers (such as Supabase, Vercel, and Paystack) to run the
              platform. These providers are bound by contracts to protect your data.
            </li>
            <li>We may share information if required by law.</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700">
            We do <strong>not</strong> sell your personal information.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">5. Security</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            We use reasonable technical and organisational measures to protect your information. While
            no system is 100% secure, we continuously work to improve our safeguards.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">6. Your Rights Under POPIA</h2>
          <p className="text-sm leading-relaxed text-gray-700">You have the right to:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Access the personal information we hold about you</li>
            <li>Ask us to correct or delete your information</li>
            <li>Object to processing for direct marketing</li>
            <li>Lodge a complaint with the Information Regulator</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700">
            To exercise these rights, contact us at the details below.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">7. Direct Marketing &amp; Communication</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            By signing up or using our service, you agree that we may contact you occasionally with
            updates, news, and relevant information about DigitalFlyer. You can unsubscribe at any time
            by replying &ldquo;STOP&rdquo; or clicking the unsubscribe link in our emails.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">8. International Transfers</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            We prefer to use services based in South Africa where possible. However, some of our service
            providers (such as Vercel and certain Supabase infrastructure) may process data outside South
            Africa. Where this happens, we use appropriate safeguards to protect your information.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">9. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            We may update this policy from time to time. The latest version will always be available on
            our website.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">10. Contact Us</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            DigitalFlyer SA
            <br />
            Email: info@digitalflyer.co.za
            <br />
            WhatsApp: +27723110570
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            If you have concerns about how we handle your personal information, please contact us first.
            You may also approach the Information Regulator at{" "}
            <a
              href="https://www.justice.gov.za/inforeg"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              www.justice.gov.za/inforeg
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
