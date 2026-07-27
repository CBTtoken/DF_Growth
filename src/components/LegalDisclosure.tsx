import { COMPANY } from "@/lib/legal/company";

// The ECTA section 43 / Companies Act section 32 disclosure block.
//
// Legal Pages Rebuild Brief Part 3: "Build requirement, not optional copy."
// It has to identify the legal person behind the site, not just the trading
// name, and give a real street address. Both properties already carried
// this on the KatisoBiz landing page footer only; this puts the same block
// on every property from one component, so the two cannot drift apart.
export function LegalDisclosure({ className = "" }: { className?: string }) {
  return (
    <div className={`text-xs leading-relaxed text-gray-400 ${className}`}>
      <p>
        {COMPANY.legalName}, registration number {COMPANY.registrationNumber}, trading as{" "}
        {COMPANY.tradingName}.
      </p>
      <p>{COMPANY.address}</p>
      <p>
        Telephone / WhatsApp: {COMPANY.phone} · {COMPANY.email}
      </p>
    </div>
  );
}
