import Link from "next/link";
import { INFORMATION_OFFICER, INFORMATION_REGULATOR } from "@/lib/legal/company";

// Schedule B of the approved legal package, reproduced as written.
//
// Same rule as the terms schedule: the wording is attorney-reviewed and is
// not paraphrased. The product name is KatisoBiz throughout because it was
// renamed after the text was drafted.
//
// B8 was marked in the source as unpublishable until a PAIA manual
// actually existed, since section 51 requires one and section 90 makes
// non-compliance an offence. The manual is now published at /paia, so the
// clause is included.
//
// B2 is the section worth not softening. It says plainly that customer
// names are not encrypted the way banking details are, and that an
// administrator could in principle read them. That is true, and a privacy
// policy that overstates its protections is worse than one that describes
// them honestly.

const h3 = "mt-8 text-base font-bold text-ink";
const p = "mt-3 text-sm leading-relaxed text-gray-700";
const cell = "border border-gray-200 px-3 py-2 align-top text-sm text-gray-700";
const th = "border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-ink";

const SUBPROCESSORS: [string, string][] = [
  ["Supabase Inc.", "Database and backend hosting"],
  ["Vercel Inc.", "Application hosting and delivery"],
  ["Resend Inc.", "Transactional and notification email"],
  ["Paystack Payments Limited", "Subscription and topup payment processing"],
];

export function KatisoBizPrivacy() {
  return (
    <section id="katisobiz" className="scroll-mt-24">
      <h2 className="font-display text-xl uppercase tracking-wide text-ink">
        KatisoBiz: where we act as operator
      </h2>
      <p className={p}>
        <em>
          This section applies to KatisoBiz, our quoting and invoicing product. It sits alongside
          everything above rather than replacing it.
        </em>
      </p>

      <h3 className={h3}>B1. Your customers&rsquo; personal information</h3>
      <p className={p}>
        B1.1 To provide KatisoBiz, we store personal information about <strong>your</strong>{" "}
        customers: typically names, physical or postal addresses, telephone numbers, email
        addresses, and a record of the work or services you performed for them.
      </p>
      <p className={p}>
        B1.2 We process this information{" "}
        <strong>solely as an operator under POPIA, on your instructions</strong>, and only to let you
        create, send and keep records of quotes, invoices, credit notes and payment status.{" "}
        <strong>
          We do not use it for our own marketing, analytics, profiling or any other purpose, and we
          do not sell or rent it.
        </strong>
      </p>

      <h3 className={h3}>B2. What DigitalFlyer staff can and cannot see</h3>
      <p className="mt-3 text-sm italic leading-relaxed text-gray-500">
        We would rather be accurate than impressive. This section describes what is actually true.
      </p>
      <p className={p}>
        B2.1 <strong>Banking details</strong> are encrypted at rest and are decrypted only at the
        moment a document is generated. Every decryption is recorded in an access log.
      </p>
      <p className={p}>
        B2.2 <strong>Your customer names and contact details</strong> are protected by database
        access controls and application-level permissions. Our support team works from screens that
        do not display your customer lists or banking details in the ordinary course of support.
      </p>
      <p className={p}>
        B2.3 <strong>We do not claim zero-knowledge encryption.</strong> Your customer names and
        contact details are not encrypted at rest in the same way as banking details. A technical
        administrator with elevated database access could in principle read them, because that
        access is necessary to maintain the service and resolve faults. We control this through
        restricted access, logging, and internal policy rather than through encryption.
      </p>
      <p className={p}>
        B2.4 We tell you this plainly because a privacy policy that overstates its protections is
        worse than one that describes them honestly.
      </p>

      <h3 className={h3}>B3. Where your information is stored</h3>
      <p className={p}>
        B3.1 KatisoBiz&rsquo;s infrastructure is hosted <strong>outside South Africa</strong>,
        currently in the European Union (Frankfurt, Germany). The European Union has data protection
        laws substantially similar to POPIA.
      </p>
      <p className={p}>
        B3.2 Your records remain{" "}
        <strong>accessible to you at all times from within South Africa</strong> through the
        KatisoBiz application, and can be exported in full at any time.
      </p>
      <p className={p}>
        B3.3 You should be aware that where SARS requires records to be kept in a particular form or
        location, meeting that requirement remains your responsibility. If you need records held
        within South Africa, contact us.
      </p>

      <h3 className={h3}>B4. Retention of financial records</h3>
      <p className={p}>
        B4.1 Financial Records are retained for <strong>at least five years</strong>, and seven
        years for registered companies, to support your obligations under the Tax Administration
        Act, the VAT Act and the Companies Act. This overrides our standard 60-day post-cancellation
        deletion timeline.
      </p>
      <p className={p}>
        B4.2 Personal information appearing <strong>on</strong> a tax invoice, such as your
        customer&rsquo;s name and address, is a legally required component of that document. It
        therefore forms part of the Financial Record and{" "}
        <strong>cannot be separated, redacted or deleted early</strong> without destroying the
        validity of the record.
      </p>
      <p className={p}>
        B4.3 Personal information that is <strong>not</strong> part of a Financial Record continues
        to follow our ordinary deletion timelines.
      </p>
      <p className={p}>
        B4.4 If one of your customers asks you to delete their information, you should be aware that
        information already contained in an issued invoice cannot lawfully be removed. Contact us
        and we will help you respond.
      </p>

      <h3 className={h3}>B5. Sub-processors</h3>
      <p className={p}>B5.1 We use the following sub-processors for KatisoBiz:</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Sub-processor</th>
              <th className={th}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map(([name, purpose]) => (
              <tr key={name}>
                <td className={cell}>{name}</td>
                <td className={cell}>{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={p}>
        B5.2 <strong>PDF rendering.</strong> Our intention is to render documents within our own
        infrastructure so that banking details are not transmitted to a third-party rendering
        service.{" "}
        <strong>
          If we adopt an external rendering provider, it will be added to the table above and this
          policy updated before any of your data is sent to it.
        </strong>
      </p>
      <p className={p}>
        B5.3 We will update this list before adding any new sub-processor that will process your
        customers&rsquo; personal information, and will notify Members by email of material changes.
      </p>

      <h3 className={h3}>B6. Security incidents</h3>
      <p className={p}>
        B6.1 If we become aware of unauthorised access to your customers&rsquo; personal
        information, we will notify you <strong>without undue delay</strong>, and will provide the
        information you need to meet your own notification obligations to the Information Regulator
        and to affected individuals under POPIA section 22.
      </p>

      <h3 className={h3}>B7. Information Officer and complaints</h3>
      <p className={p}>
        B7.1 DigitalFlyer&rsquo;s Information Officer is <strong>{INFORMATION_OFFICER.name}</strong>
        , registered with the Information Regulator (South Africa) under registration number{" "}
        <strong>{INFORMATION_OFFICER.registrationNumber}</strong>, dated{" "}
        {INFORMATION_OFFICER.registeredOn}.
      </p>
      <p className={p}>
        B7.2 The Information Officer can be reached at{" "}
        <strong>{INFORMATION_OFFICER.email}</strong>.
      </p>
      <p className={p}>
        B7.3 If you believe we have not handled personal information in accordance with POPIA, you
        may lodge a complaint with our Information Officer, or directly with the{" "}
        <strong>Information Regulator (South Africa)</strong>:
      </p>
      <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-gray-700">
        <li>
          Website:{" "}
          <a
            href={INFORMATION_REGULATOR.website}
            target="_blank"
            rel="noreferrer"
            className="text-brand underline-offset-2 hover:underline"
          >
            inforegulator.org.za
          </a>
        </li>
        <li>
          POPIA complaints: <strong>{INFORMATION_REGULATOR.popiaComplaints}</strong>
        </li>
        <li>General POPIA compliance queries: POPIACompliance@inforegulator.org.za</li>
        <li>Postal: {INFORMATION_REGULATOR.postal}</li>
      </ul>

      <h3 className={h3}>B8. Access to our records under PAIA</h3>
      <p className={p}>
        B8.1 DigitalFlyer&rsquo;s{" "}
        <Link href="/paia" className="text-brand underline-offset-2 hover:underline">
          PAIA manual
        </Link>
        , setting out the records we hold and how to request access to them, is available on our
        website and at our principal place of business.
      </p>
    </section>
  );
}
