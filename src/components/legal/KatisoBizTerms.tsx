import { COMPANY } from "@/lib/legal/company";

// Schedule A of the approved legal package, reproduced as written.
//
// The wording is the attorney-reviewed text from
// DigtialFlyer BizUp/Legal and Landing page.zip. Nothing here is
// paraphrased, tightened or "improved": it is a contract, and rewriting a
// reviewed clause quietly un-reviews it.
//
// Two changes only, both mechanical rather than substantive. The product
// is named KatisoBiz throughout, since it was renamed after the text was
// drafted. And the entity is written out in full as the schedule itself
// insists, because "DigitalFlyer SA" is a trading name and a contract has
// to identify the legal person actually bound by it.
//
// The plain-language notes are part of the approved text, not additions.
// They exist because the audience is a tradesman, and a clause nobody
// reads protects nobody.

const h3 = "mt-8 text-base font-bold text-ink";
const p = "mt-3 text-sm leading-relaxed text-gray-700";
const list = "mt-3 list-disc pl-5 text-sm leading-relaxed text-gray-700";
const plain =
  "mt-3 rounded-xl border-l-4 border-brand/40 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700";

export function KatisoBizTerms() {
  return (
    <section id="katisobiz" className="scroll-mt-24">
      <h2 className="font-display text-xl uppercase tracking-wide text-ink">
        Schedule A: KatisoBiz
      </h2>
      <p className={p}>
        <em>
          These terms apply in addition to the general DigitalFlyer SA Terms of Service above. Where
          they conflict, these terms govern for the KatisoBiz module.
        </em>
      </p>
      <p className={p}>
        <strong>Defined terms:</strong> &ldquo;Member&rdquo; means the business or individual
        subscribing to KatisoBiz. &ldquo;KatisoBiz&rdquo; means the quoting and invoicing module.
        &ldquo;Financial Records&rdquo; means quotes, invoices, tax invoices, credit notes, debit
        notes and related payment records created in KatisoBiz. &ldquo;DigitalFlyer&rdquo; means{" "}
        {COMPANY.legalName}, registration number {COMPANY.registrationNumber}, a private company
        incorporated in the Republic of South Africa, trading as {COMPANY.tradingName}.
      </p>

      <h3 className={h3}>A1. Our role and yours: responsible party and operator</h3>
      <p className={p}>
        A1.1 When you use KatisoBiz to create quotes, invoices and related documents,{" "}
        <strong>you are the responsible party</strong> under the Protection of Personal Information
        Act 4 of 2013 (&ldquo;POPIA&rdquo;) for the personal information of your own customers.
      </p>
      <p className={p}>
        A1.2 <strong>DigitalFlyer acts solely as an operator</strong> in respect of that customer
        personal information, including names, physical and postal addresses, telephone numbers,
        email addresses, and records of work or services performed.
      </p>
      <p className={p}>A1.3 DigitalFlyer undertakes to:</p>
      <ul className={list}>
        <li>
          process your customers&rsquo; personal information only on your documented instructions
          and only to provide KatisoBiz;
        </li>
        <li>
          not use, sell, rent, share or otherwise process it for any other purpose, including our
          own marketing;
        </li>
        <li>
          apply reasonable technical and organisational measures to secure it, as described in our
          Privacy Policy;
        </li>
        <li>disclose it only to the sub-processors named in our Privacy Policy;</li>
        <li>
          notify you without undue delay if we become aware of unauthorised access to it, so that
          you can meet your own obligations under POPIA section 22.
        </li>
      </ul>
      <p className={p}>
        A1.4 You warrant that you have a lawful basis under POPIA to collect your customers&rsquo;
        personal information and to instruct us to process it, and that you will comply with your
        own obligations as responsible party.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> your customer list belongs to you, not to us. We look after
        it and use it only to run KatisoBiz for you. Making sure you were allowed to collect it in
        the first place is your job.
      </p>

      <h3 className={h3}>A2. KatisoBiz is a document tool, not tax, accounting or legal advice</h3>
      <p className={p}>
        A2.1 KatisoBiz is an assistive document generation and payment-tracking tool.{" "}
        <strong>It is not accounting software, tax software, or professional advice.</strong> It
        does not perform bookkeeping, general ledgers, payroll, bank reconciliation, financial
        statements, or the preparation or submission of any tax return.
      </p>
      <p className={p}>A2.2 You remain solely responsible for:</p>
      <ul className={list}>
        <li>the accuracy of everything you enter into KatisoBiz;</li>
        <li>your own tax affairs and your VAT registration status;</li>
        <li>the correctness of every quote, invoice, tax invoice and credit note you issue;</li>
        <li>
          your compliance with the Value-Added Tax Act 89 of 1991, the Tax Administration Act 28 of
          2011 and any other applicable legislation; and
        </li>
        <li>
          obtaining advice from a registered tax practitioner or from SARS where your circumstances
          are complex.
        </li>
      </ul>
      <p className={p}>
        A2.3 DigitalFlyer does not warrant that any document produced by KatisoBiz will be accepted
        by SARS or by any third party, and accepts no liability for any tax, penalty, interest,
        assessment or other consequence arising from your use of KatisoBiz or of the documents it
        produces.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> KatisoBiz helps you make the right documents. It does not
        do your books and it is not your accountant. Your tax stays your responsibility.
      </p>

      <h3 className={h3}>A3. VAT status and VAT numbers</h3>
      <p className={p}>
        A3.1 If you enter a VAT registration number, you warrant that it is{" "}
        <strong>genuine, current, and correctly associated with your business</strong>, and that it
        matches your SARS VAT 103 certificate.
      </p>
      <p className={p}>
        A3.2 You acknowledge that entering a VAT number causes KatisoBiz to treat you as a
        registered vendor: to apply VAT at the applicable rate (currently 15%), to title documents
        &ldquo;Tax Invoice&rdquo; where required, and to display your VAT number on documents.
      </p>
      <p className={p}>
        A3.3{" "}
        <strong>
          DigitalFlyer performs a basic format check only and does not verify any VAT number with
          SARS.
        </strong>{" "}
        You accept full responsibility for the consequences of entering an incorrect, inactive or
        fraudulent VAT number, including the consequences of charging VAT when you are not a
        registered vendor.
      </p>
      <p className={p}>
        A3.4 If you have not entered a VAT number, KatisoBiz will not apply VAT and will not title
        documents &ldquo;Tax Invoice&rdquo;. You remain responsible for monitoring whether you have
        become obliged to register for VAT.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> if you tell us you are VAT registered, we believe you and
        start adding 15%. We do not check with SARS. Charging VAT when you are not registered is a
        serious offence and that is on you, not us.
      </p>

      <h3 className={h3}>A4. Retention of your Financial Records</h3>
      <p className={p}>
        A4.1 South African law requires business records to be retained. Under{" "}
        <strong>sections 29 and 32 of the Tax Administration Act 28 of 2011</strong>, records must
        generally be kept for <strong>five years from the date of submission of the relevant
        return</strong>, or five years from the end of the relevant tax period where no return is
        required. <strong>Section 55 of the Value-Added Tax Act 89 of 1991</strong> imposes an
        equivalent obligation on VAT vendors. Where SARS has notified you of an audit,
        investigation, objection, appeal or dispute, records must be kept until that matter is
        concluded.
      </p>
      <p className={p}>
        A4.2 If you are a registered company,{" "}
        <strong>
          section 24 of the Companies Act 71 of 2008 requires certain financial records to be kept
          for seven years.
        </strong>{" "}
        Where more than one law applies, the longer period governs.
      </p>
      <p className={p}>
        A4.3 Accordingly, and notwithstanding any general deletion or retention policy applying to
        other DigitalFlyer products,{" "}
        <strong>
          DigitalFlyer will retain your Financial Records for a minimum of five years
        </strong>
        , and for seven years where we hold information indicating that you are a registered
        company. This obligation <strong>survives cancellation, non-renewal or termination</strong>{" "}
        of your subscription.
      </p>
      <p className={p}>
        A4.4{" "}
        <strong>
          You may request a copy of your retained Financial Records at any time during the retention
          period
        </strong>
        , whether or not your subscription is active, by contacting us. We will provide them within
        a reasonable time and at no charge for a reasonable number of requests. This is so that you
        can meet your own obligations if SARS requests records from you after you have stopped using
        KatisoBiz.
      </p>
      <p className={p}>
        A4.5 After the applicable retention period expires, we may permanently delete the records.
        We are not obliged to notify you before doing so, and you should keep your own copies.
      </p>
      <p className={p}>
        A4.6 This retention obligation{" "}
        <strong>overrides DigitalFlyer&rsquo;s standard 60-day deletion cycle</strong>, which
        continues to apply to non-financial data such as marketing preferences and contact histories.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> the law says invoices must be kept for five years, or seven
        if you are a company. So we keep them for you even after you leave, and you can ask us for
        them at any time during that period. If SARS ever comes knocking, you can still get your
        records.
      </p>

      <h3 className={h3}>A5. Cancellation, export, and access after you leave</h3>
      <p className={p}>
        A5.1 On cancellation, non-renewal or termination, you keep{" "}
        <strong>read-only access to your KatisoBiz dashboard for sixty (60) days</strong>, during
        which you can view, download and export your data as often as you wish.
      </p>
      <p className={p}>
        A5.2 An export consists of PDF copies of every document, together with a structured
        spreadsheet file (CSV or XLSX) listing every document and its key details.{" "}
        <strong>
          Each export is delivered as a secure download link that expires after seven (7) days
        </strong>
        , because the file contains personal information and should not remain accessible
        indefinitely.
      </p>
      <p className={p}>
        A5.3 After the sixty-day period, dashboard access is withdrawn and your Financial Records
        move into secure long-term retention under clause A4.{" "}
        <strong>
          You may still request them at any time during the retention period under clause A4.4.
        </strong>
      </p>
      <p className={p}>
        A5.4 <strong>If DigitalFlyer ceases to operate KatisoBiz</strong>, we will give you at least
        sixty (60) days&rsquo; notice by email to your registered address, during which you may
        export all of your data. Where we are unable to give notice, we will use reasonable efforts
        to make your Financial Records available to you or to transfer the retention obligation to a
        suitable third party.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> if you leave, you have two months to log in and download
        everything. After that we still hold your records and you can ask us for them. If we ever
        shut KatisoBiz down, we will give you two months&rsquo; warning first.
      </p>

      <h3 className={h3}>A6. Delivery of documents, and non-payment by your customers</h3>
      <p className={p}>
        A6.1 KatisoBiz provides technical means to deliver documents by email, and to generate links
        for you to share through third-party platforms such as WhatsApp.
      </p>
      <p className={p}>
        A6.2{" "}
        <strong>
          DigitalFlyer does not guarantee that any document will be received, delivered, opened or
          read.
        </strong>{" "}
        Delivery depends on networks, mail providers and messaging platforms outside our control.
        Subject to clause A9, we accept no liability where your customer does not receive, open or
        act on a document.
      </p>
      <p className={p}>
        A6.3{" "}
        <strong>
          DigitalFlyer is not a party to any transaction between you and your customer.
        </strong>{" "}
        We do not collect payment on your behalf, and we accept no responsibility for non-payment,
        late payment, billing disputes, chargebacks or debt collection between you and your
        customers. Pursuing amounts owed to you is your responsibility.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> we help you send the document. We cannot promise your
        customer opens it, and we are not involved in whether or not they pay you.
      </p>

      <h3 className={h3}>A7. Banking details on your documents</h3>
      <p className={p}>
        A7.1{" "}
        <strong>You are solely responsible for the accuracy of any banking details you enter.</strong>{" "}
        DigitalFlyer displays the details exactly as you supply them.
      </p>
      <p className={p}>
        A7.2 Subject to clause A9, DigitalFlyer accepts no liability for delayed payments,
        misdirected transfers or funds paid to an incorrect account as a result of details you
        entered incorrectly.
      </p>
      <p className={p}>
        A7.3 KatisoBiz offers an optional notice on your documents warning your customers to verify
        banking details before paying.{" "}
        <strong>
          Invoice interception fraud, in which a criminal alters banking details on an intercepted
          invoice, is common in South Africa.
        </strong>{" "}
        If you disable this notice, you do so at your own risk and accept responsibility for that
        choice.
      </p>
      <p className={p}>
        A7.4 Changing your stored banking details requires email confirmation, to protect you
        against unauthorised changes.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> we print the bank details you give us. If you type them
        wrong, the money goes to the wrong place and that is not something we can fix. We strongly
        suggest leaving the fraud warning switched on.
      </p>

      <h3 className={h3}>A8. Acceptable use</h3>
      <p className={p}>A8.1 You may not use KatisoBiz to:</p>
      <ul className={list}>
        <li>
          issue any document that is false, fraudulent, or misrepresents a transaction that did not
          occur;
        </li>
        <li>represent yourself as a VAT vendor when you are not registered;</li>
        <li>issue documents on behalf of a business you are not authorised to represent;</li>
        <li>process personal information you have no lawful basis to hold; or</li>
        <li>do anything unlawful.</li>
      </ul>
      <p className={p}>
        A8.2 DigitalFlyer may suspend or terminate your access where we reasonably believe this
        clause has been breached.{" "}
        <strong>
          Suspension does not release us from the retention obligations in clause A4, nor from your
          access rights under clause A4.4.
        </strong>
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> do not use KatisoBiz to make up fake invoices or pretend to
        be VAT registered. If you do, we can shut your account, but we will still keep your records
        as the law requires.
      </p>

      <h3 className={h3}>A9. Liability</h3>
      <p className={p}>
        A9.1 Nothing in these terms excludes or limits any liability that cannot lawfully be
        excluded or limited, including liability arising from gross negligence, and nothing limits
        any right you have under the <strong>Consumer Protection Act 68 of 2008</strong> where that
        Act applies to you.
      </p>
      <p className={p}>
        A9.2 Subject to A9.1, DigitalFlyer&rsquo;s total liability to you in connection with
        KatisoBiz in any twelve-month period is limited to the total subscription fees you paid for
        KatisoBiz in that period.
      </p>
      <p className={p}>
        A9.3 Subject to A9.1, DigitalFlyer is not liable for indirect or consequential loss, loss of
        profit, loss of business or loss of data.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> if we get something badly wrong, there are limits on what
        we owe you, but we are not trying to sign away rights the law gives you.
      </p>

      <h3 className={h3}>A10. Fees, cancellation and refunds</h3>
      <p className={p}>
        A10.1 KatisoBiz subscriptions are billed monthly in advance. You may cancel at any time,
        effective at the end of the current billing month.{" "}
        <strong>We do not pro-rate refunds for a partial month.</strong>
      </p>
      <p className={p}>
        A10.2 <strong>Document topups are once-off purchases.</strong> Topup documents do not expire
        and carry over between months. Topups are non-refundable once any document from that topup
        has been used.
      </p>
      <p className={p}>
        A10.3 Where the Electronic Communications and Transactions Act 25 of 2002 or the Consumer
        Protection Act gives you a cooling-off or cancellation right, that right applies and is not
        affected by this clause.
      </p>
      <p className={p}>
        A10.4 If your subscription lapses, your entitlement reverts to the free plan.{" "}
        <strong>Nothing is deleted.</strong> Documents beyond the free plan limit remain visible and
        downloadable, but you cannot issue new documents until you resubscribe.
      </p>
      <p className={plain}>
        <strong>In plain terms:</strong> cancel whenever you like, at the end of the month you have
        paid for. Topup documents never expire. Falling back to the free plan never deletes
        anything.
      </p>
    </section>
  );
}
