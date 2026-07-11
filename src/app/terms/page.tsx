import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";

// Sprint 1, Build Item 9. Content is final, provided by Dewald 2026-07-11 —
// rendered verbatim, not edited. Only the two bracketed placeholders in the
// original text (the effective date, and this page's contact details) were
// filled in with values Dewald confirmed, nothing else changed.
export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing your use of the DigitalFlyer platform and services.",
};

export default function TermsPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-ink">
            DigitalFlyer Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-gray-500">Effective Date: 2026/07/11</p>
          <p className="text-sm text-gray-500">Last Updated: 11 July 2026</p>
        </div>

        <p className="text-sm leading-relaxed text-gray-700">
          These Terms &amp; Conditions govern your use of the DigitalFlyer platform and services. By
          signing up or using our service, you agree to these terms.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">1. About DigitalFlyer</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            DigitalFlyer provides tools for small South African businesses to create professional landing
            pages, generate leads, and (on paid plans) track advertising performance.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">2. Your Responsibilities</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Provide accurate information during signup and keep it updated.</li>
            <li>You are responsible for how you follow up and use any leads generated through your page.</li>
            <li>You must not use the platform for any illegal or harmful purpose.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">3. Our Responsibilities</h2>
          <p className="text-sm leading-relaxed text-gray-700">We will:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Provide the platform and tools as described.</li>
            <li>Protect your data with reasonable security measures.</li>
            <li>Be transparent about our pricing and what is included in each plan.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">4. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            We provide the platform on an &ldquo;as is&rdquo; basis. We are not responsible for:
          </p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>The quality or outcome of leads generated.</li>
            <li>Any loss or damage resulting from how you use the platform or follow up leads.</li>
            <li>Technical issues beyond our reasonable control.</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700">
            Our total liability to you is limited to the fees you have paid us in the three months before
            any claim.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">5. Fees and Payment</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Foundation and Growth plans are billed monthly or annually via Paystack.</li>
            <li>You can cancel your subscription at any time from your dashboard. There are no long-term contracts.</li>
            <li>Refunds are handled on a case-by-case basis at our discretion.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">6. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            You keep ownership of your content, logo, and business information. We retain ownership of
            the platform, templates, and systems.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">7. Termination</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            Either party may end the relationship at any time. Upon termination, your access to paid
            features will end, but you can export your data during the notice period.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">8. Changes to These Terms</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            We may update these Terms from time to time. Continued use of the platform after changes
            means you accept the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">9. Governing Law</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            These Terms are governed by the laws of the Republic of South Africa.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">10. Contact</h2>
          <p className="text-sm leading-relaxed text-gray-700">
            DigitalFlyer SA
            <br />
            Email: info@digitalflyer.co.za
            <br />
            WhatsApp: +27723110570
          </p>
        </section>
      </div>
    </main>
  );
}
