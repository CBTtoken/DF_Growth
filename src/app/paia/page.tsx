import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  COMPANY,
  INFORMATION_OFFICER,
  LEGAL_CANONICAL_HOST,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal/company";

// PAIA manual, section 51 of the Promotion of Access to Information Act.
//
// Legal Pages Rebuild Brief Part 5 item 1: a statutory requirement for every
// private body, and the site had no such page at all.
//
// The wording is Dewald's approved draft (digitalflyer-paia-manual.md in the
// legal handover package), reproduced as written. Nothing here has been
// rewritten, summarised or improved, per the brief's explicit instruction.
// The only edits are the ones the manual's own completion checklist asks
// for: filling the fourteen bracketed fields, and deleting section 7.10 and
// the two employment statutes because the Company has no employees.
//
// Prescribed PAIA fees were taken from the Regulator's own published
// schedule on 27 July 2026. They are set by regulation and do change, so
// they are the one part of this page worth re-checking at review.
export const metadata: Metadata = {
  title: "PAIA Manual",
  description:
    "Manual of Digital Flyer (Pty) Ltd in terms of section 51 of the Promotion of Access to Information Act 2 of 2000.",
  // Brief Part 2.2: the same routes are served on every mapped domain, so a
  // canonical host stops search engines treating them as duplicates.
  alternates: { canonical: `${LEGAL_CANONICAL_HOST}/paia` },
};

const h2 = "font-display text-xl uppercase tracking-wide text-ink";
const h3 = "text-base font-bold text-ink";
const p = "text-sm leading-relaxed text-gray-700";
const cell = "border border-gray-200 px-3 py-2 align-top text-sm text-gray-700";
const th = "border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-ink";

function Table({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    // Wrapped so a narrow phone scrolls the table rather than the page.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>{head[0]}</th>
            <th className={th}>{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td className={cell}>{a}</td>
              <td className={cell}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PaiaManualPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <MarketingHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-ink">PAIA Manual</h1>
          <p className={`mt-2 ${p}`}>
            Manual of {COMPANY.legalName} in terms of section 51 of the Promotion of Access to
            Information Act 2 of 2000.
          </p>
          <p className="mt-2 text-sm text-gray-500">Date of compilation: 27 July 2026</p>
          <p className="text-sm text-gray-500">Date of last revision: {LEGAL_LAST_UPDATED}</p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>1. Definitions and abbreviations</h2>
          <Table
            head={["Term", "Meaning"]}
            rows={[
              [
                "the Company",
                `${COMPANY.legalName}, registration number ${COMPANY.registrationNumber}, trading as ${COMPANY.tradingName}`,
              ],
              ["IO", "Information Officer"],
              ["PAIA", "Promotion of Access to Information Act 2 of 2000, as amended"],
              ["POPIA", "Protection of Personal Information Act 4 of 2013"],
              ["the Regulator", "The Information Regulator (South Africa)"],
              ["Requester", "Any person requesting access to a record held by the Company"],
              [
                "Personal Requester",
                "A requester seeking access to a record containing their own personal information",
              ],
              ["Data Subject", "The person to whom personal information relates"],
              [
                "Operator",
                "A person who processes personal information for a responsible party, without coming under their direct authority",
              ],
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>2. Purpose of this manual</h2>
          <p className={p}>
            2.1 PAIA gives effect to the constitutional right of access to information held by public
            and private bodies, where that information is required for the exercise or protection of
            any right.
          </p>
          <p className={p}>
            2.2 Section 51 of PAIA requires every private body to compile and make available a manual
            describing the records it holds and how a person may request access to them.
          </p>
          <p className={p}>2.3 This manual sets out:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>who to contact at the Company to request access to a record;</li>
            <li>what categories of records the Company holds;</li>
            <li>
              how the Company processes personal information, as required by section 51 as amended by
              POPIA;
            </li>
            <li>the procedure, fees and timelines for making a request; and</li>
            <li>what a requester can do if a request is refused.</li>
          </ul>
          <p className={p}>
            2.4 Providing information in this manual beyond what PAIA and POPIA require does not
            create any contractual or other entitlement to that information.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>3. Particulars of the Company</h2>
          <Table
            head={["", ""]}
            rows={[
              ["Registered name", COMPANY.legalName],
              ["Trading name", COMPANY.tradingName],
              ["Registration number", COMPANY.registrationNumber],
              ["Type", "Private company"],
              ["Physical address", COMPANY.address],
              ["Postal address", COMPANY.address],
              ["Telephone / WhatsApp", COMPANY.phone],
              ["Website", "https://digitalflyersa.co.za"],
            ]}
          />

          <h3 className={h3}>Information Officer</h3>
          <p className={p}>
            Under section 1 of PAIA, the head of a private body is automatically the Information
            Officer.
          </p>
          <Table
            head={["", ""]}
            rows={[
              ["Information Officer", INFORMATION_OFFICER.name],
              ["Capacity", "Head of the private body"],
              [
                "Registration with the Regulator",
                `Registration number ${INFORMATION_OFFICER.registrationNumber}, registered ${INFORMATION_OFFICER.registeredOn}`,
              ],
              ["Email", INFORMATION_OFFICER.email],
              ["Telephone / WhatsApp", COMPANY.phone],
              ["Postal address", COMPANY.address],
              ["Physical address", COMPANY.address],
            ]}
          />

          <h3 className={h3}>Deputy Information Officer</h3>
          <p className={p}>
            The Company has not designated a Deputy Information Officer. All requests should be
            directed to the Information Officer.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>4. The Regulator&rsquo;s guide on how to use PAIA</h2>
          <p className={p}>
            4.1 The Regulator has compiled a guide, in terms of section 10 of PAIA, to help members of
            the public exercise their rights under PAIA and POPIA.
          </p>
          <p className={p}>4.2 The guide is available from:</p>
          <p className={p}>
            <strong>The Information Regulator (South Africa)</strong>
            <br />
            Website:{" "}
            <a
              href="https://inforegulator.org.za"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              inforegulator.org.za
            </a>
            <br />
            Physical: Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg
            <br />
            Postal: P.O. Box 31533, Braamfontein, Johannesburg, 2017
            <br />
            PAIA complaints: PAIAComplaints@inforegulator.org.za
            <br />
            POPIA complaints: POPIAComplaints@inforegulator.org.za
            <br />
            General compliance: POPIACompliance@inforegulator.org.za
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>5. Records available without a PAIA request</h2>
          <p className={p}>
            The following are freely available on the Company&rsquo;s websites and do not require a
            formal request:
          </p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>
              Product, service and pricing information for DigitalFlyer SA, DigitalFlyer Growth and
              KatisoBiz
            </li>
            <li>Terms of service and privacy policies</li>
            <li>Public marketplace entries created and published by businesses themselves</li>
            <li>Publicly published customer reviews</li>
            <li>Publicly listed events</li>
            <li>Blog, help and support content</li>
            <li>This PAIA manual</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>6. Records available under other legislation</h2>
          <p className={p}>Records may also be accessible in terms of, among others:</p>
          {/* The two employment statutes are omitted, as the manual's own
              checklist directs, because the Company has no employees. */}
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Companies Act 71 of 2008</li>
            <li>Consumer Protection Act 68 of 2008</li>
            <li>Protection of Personal Information Act 4 of 2013</li>
            <li>Tax Administration Act 28 of 2011</li>
            <li>Value-Added Tax Act 89 of 1991</li>
            <li>Income Tax Act 58 of 1962</li>
            <li>Electronic Communications and Transactions Act 25 of 2002</li>
          </ul>
          <p className="text-sm italic leading-relaxed text-gray-500">
            This list may be incomplete. The Company will update it as it becomes aware of other
            legislation permitting access.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>7. Categories of records held by the Company</h2>
          <p className={p}>
            Access to these records is subject to the grounds of refusal in Chapter 4 of Part 3 of
            PAIA.
          </p>

          <h3 className={h3}>7.1 Company and governance records</h3>
          <p className={p}>
            Founding documents, CIPC filings, shareholder and director records, board or member
            resolutions, statutory registers, licences and registrations, insurance policies.
          </p>

          <h3 className={h3}>7.2 Financial and tax records</h3>
          <p className={p}>
            Management accounts, annual financial statements, bank records, invoices issued and
            received, payment records, VAT records, SARS correspondence and returns, payroll records.
          </p>

          <h3 className={h3}>
            7.3 Customer and member records, DigitalFlyer SA and DigitalFlyer Growth
          </h3>
          <p className={p}>
            Account and contact details of businesses using the platform, subscription and billing
            records, marketplace entry content, onboarding submissions, uploaded brand assets and
            logos, support correspondence, referral and commission records for agents.
          </p>

          <h3 className={h3}>7.4 Reviewer records</h3>
          <p className={p}>
            Reviewer account details, email addresses used for verification, submitted reviews.
          </p>

          <h3 className={h3}>7.5 KatisoBiz module records</h3>
          <p className={p}>
            Member business details, member banking details, member subscription and topup records,
            and <strong>personal information of the member&rsquo;s own customers</strong> including
            names, contact details, addresses and records of work performed. See section 8.6 below,
            which explains that the Company holds this last category as an operator and not as a
            responsible party.
          </p>

          <h3 className={h3}>7.6 Shop, book and event records</h3>
          <p className={p}>
            Order records, delivery details and payment references for purchases made through the
            Company&rsquo;s shop, including sales of the book Standing 365. Event registration
            records.
          </p>

          <h3 className={h3}>7.7 Marketing and communication records</h3>
          <p className={p}>
            Email subscriber records, consent and unsubscribe records, delivery, bounce and complaint
            records, campaign performance data.
          </p>

          <h3 className={h3}>7.8 Technical and operational records</h3>
          <p className={p}>
            Application logs, error and security logs, access and audit logs, analytics data, backup
            records.
          </p>

          <h3 className={h3}>7.9 Supplier and contractor records</h3>
          <p className={p}>
            Agreements, contact details and payment records for suppliers, contractors and service
            providers.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>8. Processing of personal information</h2>
          <p className="text-sm italic leading-relaxed text-gray-500">
            Required by section 51 of PAIA as amended by POPIA.
          </p>

          <h3 className={h3}>8.1 Purposes of processing</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Providing, operating and supporting the Company&rsquo;s products and services</li>
            <li>Creating and maintaining accounts and subscriptions</li>
            <li>Processing payments and maintaining billing records</li>
            <li>
              Publishing marketplace entries and reviews at the request of the business or reviewer
              concerned
            </li>
            <li>
              Enabling KatisoBiz members to create, send and store quotes, invoices and related
              records
            </li>
            <li>Fulfilling orders for goods and events</li>
            <li>
              Communicating with customers, including service messages and, where consent has been
              given, marketing
            </li>
            <li>Meeting legal, tax and regulatory obligations</li>
            <li>Detecting and preventing fraud and abuse</li>
            <li>Improving the Company&rsquo;s products and services</li>
          </ul>

          <h3 className={h3}>8.2 Categories of data subjects and their personal information</h3>
          <Table
            head={["Data subjects", "Personal information processed"]}
            rows={[
              [
                "Business owners and members",
                "Name, business name, contact details, address, business registration number, VAT number, banking details, login credentials, billing records",
              ],
              [
                "Members' own customers (KatisoBiz only)",
                "Name, contact details, address, VAT number, records of work or services performed",
              ],
              ["Reviewers", "Name, email address, review content"],
              [
                "Shop and event customers",
                "Name, contact and delivery details, order and payment references",
              ],
              [
                "Agents and referral partners",
                "Name, contact details, banking details, commission records",
              ],
              [
                "Website visitors",
                "IP address, device and browser data, analytics identifiers, cookie data",
              ],
              ["Suppliers and contractors", "Name, contact details, banking details"],
            ]}
          />

          <h3 className={h3}>8.3 Recipients of personal information</h3>
          <p className={p}>
            Personal information may be shared with the following categories of recipient, in each
            case only as necessary:
          </p>
          {/* The manual left this table to be completed. Filled from the
              sub-processors the platform actually uses, per the rebuild
              brief's own findings. There is no PDF rendering provider to
              list: documents are rendered in-house, so no third party ever
              receives a member's banking or customer details for that. */}
          <Table
            head={["Recipient", "Purpose"]}
            rows={[
              ["Supabase Inc.", "Database and backend hosting"],
              ["Vercel Inc.", "Application hosting and delivery"],
              ["Resend Inc.", "Transactional and marketing email delivery"],
              ["Paystack Payments Limited", "Payment processing"],
              [
                "Anthropic PBC",
                "AI generation of draft page copy, using the business details the member supplies during onboarding",
              ],
              ["Google (Analytics)", "Website analytics"],
              ["Meta Platforms", "Advertising measurement, where the visitor has consented"],
              ["Sentry", "Error monitoring"],
              ["Cloudflare, Inc.", "Bot protection on public forms"],
              ["ScreenshotOne", "Generating page preview images"],
              ["Pexels", "Stock imagery"],
              [
                "Professional advisers, auditors and regulators",
                "Legal, tax and compliance obligations",
              ],
              ["Law enforcement or courts", "Where required by law"],
            ]}
          />
          <p className={p}>The Company does not sell personal information.</p>

          <h3 className={h3}>8.4 Cross-border transfers</h3>
          <p className={p}>
            Personal information is stored and processed <strong>outside the Republic of South
            Africa</strong>, principally in the European Union (Frankfurt, Germany), which has data
            protection laws substantially similar to POPIA. Certain sub-processors listed above are
            established in the United States and process personal information there.
          </p>
          <p className={p}>
            Transfers are made in accordance with <strong>section 72 of POPIA</strong>, on the basis
            that the recipients are subject to laws or binding agreements providing an adequate level
            of protection, or that the transfer is necessary for the performance of a contract with
            the data subject.
          </p>

          <h3 className={h3}>8.5 Security measures</h3>
          <p className={p}>
            The Company applies appropriate, reasonable technical and organisational measures,
            including:
          </p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Encryption of data in transit</li>
            <li>
              Encryption at rest of particularly sensitive fields, including banking details, with
              decryption logged
            </li>
            <li>
              Role-based access controls and database-level access restrictions separating each
              customer&rsquo;s data
            </li>
            <li>
              Restricted administrative access, with support functions unable to view customer lists
              or banking details in the ordinary course of support
            </li>
            <li>Authentication controls on all accounts</li>
            <li>Logging and monitoring, including error and security monitoring</li>
            <li>Regular backups</li>
            <li>Contractual obligations imposed on sub-processors</li>
          </ul>
          <p className={p}>
            <strong>The Company does not employ zero-knowledge encryption.</strong> Technical
            administrators may access data where necessary to maintain the service and resolve
            faults. This access is restricted, logged, and governed by internal policy.
          </p>

          <h3 className={h3}>8.6 Where the Company acts as an operator, not a responsible party</h3>
          <p className={p}>
            For the <strong>KatisoBiz module</strong>, personal information relating to a
            member&rsquo;s own customers is processed by the Company <strong>solely as an
            operator</strong> under POPIA, on the documented instructions of that member.
          </p>
          <p className={p}>
            The <strong>member is the responsible party</strong> for their customers&rsquo; personal
            information. A request by one of those customers to access, correct or delete their
            information should be directed to the member, not to the Company. Where such a request
            reaches the Company, it will be referred to the relevant member.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>9. How to request access to a record</h2>

          <h3 className={h3}>9.1 Form</h3>
          <p className={p}>
            A request must be made on the prescribed form,{" "}
            <strong>Form 2 of Annexure B to the PAIA Regulations (GNR 757 of 27 August 2021)</strong>,
            available from{" "}
            <a
              href="https://inforegulator.org.za"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              inforegulator.org.za
            </a>{" "}
            or from the Information Officer on request.
          </p>

          <h3 className={h3}>9.2 Where to send it</h3>
          <p className={p}>To the Information Officer at the addresses in section 3 above.</p>

          <h3 className={h3}>9.3 What the request must contain</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>Sufficient detail to identify the record and the Information Officer</li>
            <li>The requester&rsquo;s identity, with acceptable proof of identity</li>
            <li>The form of access required</li>
            <li>Postal, email or other address for a reply</li>
            <li>
              <strong>
                The right the requester is seeking to exercise or protect, and an explanation of why
                the record is required to exercise or protect that right.
              </strong>{" "}
              This is a requirement of section 53(2)(d) of PAIA and a request that omits it is likely
              to be refused.
            </li>
            <li>
              Where the request is made on behalf of another person, proof of the authority to do so
            </li>
          </ul>

          <h3 className={h3}>9.4 Fees</h3>
          <Table
            head={["Fee", "Amount"]}
            rows={[
              ["Request fee, other than a personal requester", "R140.00"],
              ["Access fee, per A4 photocopy or printed page", "R2.00"],
              ["Access fee, record on a flash drive", "R40.00"],
              ["Access fee, record on a compact disc", "R40.00, or R60.00 where a copy is required"],
              [
                "Search and preparation",
                "R145.00 per hour, or part of an hour, excluding the first hour, capped at R435.00",
              ],
              [
                "Deposit, where preparation is likely to exceed six hours",
                "One third of the access fee payable",
              ],
            ]}
          />
          <p className={p}>
            A <strong>personal requester</strong>, meaning someone requesting a record containing
            their own personal information, <strong>is not required to pay a request fee</strong>.
            Access fees may still apply.
          </p>
          <p className={p}>
            The Information Officer will notify the requester of any fee payable before processing the
            request, and may require payment before access is given.
          </p>

          <h3 className={h3}>9.5 Timelines</h3>
          <p className={p}>
            The Information Officer will decide within <strong>thirty (30) days</strong> of receiving
            the request, and will notify the requester in writing. This period may be extended by a
            further thirty days in the circumstances allowed by section 57 of PAIA, in which case the
            requester will be notified.
          </p>

          <h3 className={h3}>9.6 Grounds for refusal</h3>
          <p className={p}>
            Access may be refused on the grounds in Chapter 4 of Part 3 of PAIA, including the
            mandatory protection of:
          </p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>the privacy of a third party who is a natural person (section 63)</li>
            <li>commercial information of a third party (section 64)</li>
            <li>information supplied in confidence (section 65)</li>
            <li>research information (section 69)</li>
            <li>legally privileged records (section 67)</li>
            <li>the Company&rsquo;s own commercial information (section 68)</li>
          </ul>
          <p className={p}>
            Section 70 of PAIA provides that access must nevertheless be granted where disclosure
            would reveal a substantial contravention of the law or an imminent and serious public
            safety or environmental risk, and the public interest in disclosure clearly outweighs the
            harm.
          </p>
          <p className={p}>Reasons for any refusal will be given in writing.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>10. Remedies if a request is refused</h2>
          <p className={p}>
            10.1 There is <strong>no internal appeal</strong> against a decision of the head of a
            private body.
          </p>
          <p className={p}>10.2 A requester may:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>
              lodge a complaint with the <strong>Information Regulator</strong>, using the prescribed
              form, at PAIAComplaints@inforegulator.org.za; or
            </li>
            <li>
              apply to a <strong>court</strong> with jurisdiction, in terms of section 78 of PAIA,
              within 180 days of the decision.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>11. Availability of this manual</h2>
          <p className={p}>11.1 This manual is available:</p>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-700">
            <li>
              on the Company&rsquo;s website at {LEGAL_CANONICAL_HOST}/paia;
            </li>
            <li>
              at the Company&rsquo;s principal place of business for inspection during normal business
              hours; and
            </li>
            <li>to any person on request, on payment of the prescribed fee.</li>
          </ul>
          <p className={p}>
            11.2 It is available in <strong>English</strong>.
          </p>
          <p className={p}>
            11.3 It will be updated on a regular basis as required by section 51(2) of PAIA.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-gray-200 pt-6">
          <p className={p}>
            <strong>Approved by:</strong>
          </p>
          <p className={p}>
            {INFORMATION_OFFICER.name}
            <br />
            Information Officer
            <br />
            {COMPANY.legalName}
          </p>
          <p className="text-sm text-gray-500">Date: {LEGAL_LAST_UPDATED}</p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
