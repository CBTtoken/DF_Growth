import Image from "next/image";
import Link from "next/link";
import { openBenefit, claimBenefit, confirmBenefitUsed } from "@/app/svc/account/actions";
import { formatRand } from "@/lib/svc/data";
import type { BenefitIssue } from "@/lib/svc/ledger";
import { svcInput } from "@/components/svc/ui";

/**
 * One benefit in the member's month, with its state made visible and the
 * next action obvious (handoff section 5: every action is a labelled
 * button). Each state transition is a form post to a server action that
 * writes its timestamp; nothing here is client-side state.
 *
 * External education benefits carry their partner link (Monthly Saver
 * document: Train 4 Wealth and Venora open in new tabs).
 */
const PARTNER_LINKS: Record<string, { href: string; label: string }> = {
  "Online e-course": { href: "https://train4wealth.com", label: "Choose my course at Train 4 Wealth" },
  "E-book of your choice": { href: "https://venora.co.za", label: "Browse the Venora library" },
};

/** The retailer's mark on its own coupon card, matched by name. */
function retailerLogo(benefitName: string): { src: string; alt: string } | null {
  const name = benefitName.toLowerCase();
  if (name.includes("dis-chem")) return { src: "/svc/brands/dischem.png", alt: "Dis-Chem Pharmacies" };
  if (name.includes("checkers") || name.includes("shoprite"))
    return { src: "/svc/brands/checkers.png", alt: "Shoprite and Checkers" };
  if (name.includes("pick n pay")) return { src: "/svc/brands/pnp.png", alt: "Pick n Pay" };
  return null;
}

export function BenefitCard({
  issue,
  back,
  moxiePathPrefix,
  couponPortalUrl,
}: {
  issue: BenefitIssue;
  back: "/account" | "/account/coupons";
  moxiePathPrefix?: string;
  couponPortalUrl?: string | null;
}) {
  const isCoupon = issue.benefit?.benefit_type === "coupon_pack";
  const isMagazine = issue.benefit?.benefit_type === "magazine_access";
  const partnerLink = issue.benefit ? PARTNER_LINKS[issue.benefit.name] : undefined;
  const logo = isCoupon && issue.benefit ? retailerLogo(issue.benefit.name) : null;

  const statusLabel = {
    issued: "New this month",
    opened: "Viewed",
    claimed: "Selected",
    redeemed: "Used",
    expired: "Expired",
  }[issue.status];

  return (
    <article className="border-2 border-svc-ink/15 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {logo && (
            <span className="mb-2 inline-flex border-2 border-svc-ink/10 bg-white p-1.5">
              <Image src={logo.src} alt={logo.alt} width={120} height={54} className="h-auto w-24" />
            </span>
          )}
          <h3 className="font-svc-heading text-base font-bold">{issue.benefit?.name}</h3>
          {issue.benefit?.description && (
            <p className="mt-1 text-sm leading-relaxed text-svc-ink/70">{issue.benefit.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {issue.face_value_cents > 0 && (
            <p className="text-sm font-bold text-svc-blue">{formatRand(issue.face_value_cents)}</p>
          )}
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-svc-green">{statusLabel}</p>
        </div>
      </div>

      {issue.unique_code && issue.status !== "issued" && (
        <p className="mt-3 border-2 border-svc-green/40 bg-svc-cream px-3 py-2 text-center font-mono text-lg font-bold tracking-widest">
          {issue.unique_code}
        </p>
      )}

      {issue.status === "redeemed" ? (
        <p className="mt-3 text-sm text-svc-ink/70">
          Used{issue.realised_value_cents ? `, ${formatRand(issue.realised_value_cents)} counted in your savings` : ""}.
        </p>
      ) : issue.status === "expired" ? null : (
        <div className="mt-4 space-y-3">
          {issue.status === "issued" && (
            <form action={openBenefit}>
              <input type="hidden" name="issue" value={issue.id} />
              <input type="hidden" name="back" value={back} />
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink"
              >
                {isCoupon ? "Show my coupon" : isMagazine ? "Open the magazine" : "Open this benefit"}
              </button>
            </form>
          )}

          {issue.status === "opened" && (
            <form action={claimBenefit}>
              <input type="hidden" name="issue" value={issue.id} />
              <input type="hidden" name="back" value={back} />
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink"
              >
                {isCoupon ? "Add to my coupons for this trip" : "I am taking this one"}
              </button>
            </form>
          )}

          {isMagazine && moxiePathPrefix !== undefined && issue.status !== "issued" && (
            <Link
              href={moxiePathPrefix}
              className="inline-flex min-h-12 w-full items-center justify-center border-2 border-svc-green px-5 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
            >
              Read Moxie with this account
            </Link>
          )}

          {isCoupon && couponPortalUrl && (
            <a
              href={couponPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center border-2 border-svc-blue px-5 text-center text-sm font-semibold text-svc-blue hover:bg-svc-blue hover:text-white"
            >
              Browse and redeem on our coupon partner&apos;s site
            </a>
          )}
          {isCoupon && couponPortalUrl && (
            <p className="text-xs text-svc-ink/60">
              Opens in a new tab. Log in there with this cell number; your
              coupons follow your number. Come back and tap I used this so
              your savings count.
            </p>
          )}

          {partnerLink && issue.status !== "issued" && (
            <a
              href={partnerLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center border-2 border-svc-green px-5 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
            >
              {partnerLink.label}
            </a>
          )}

          {(issue.status === "opened" || issue.status === "claimed") && (
            <form action={confirmBenefitUsed} className="border-t-2 border-svc-ink/10 pt-3">
              <input type="hidden" name="issue" value={issue.id} />
              <input type="hidden" name="back" value={back} />
              <label htmlFor={`amount-${issue.id}`} className="block text-xs font-semibold uppercase tracking-wide text-svc-ink/60">
                Used it? Tell us and it counts in your savings
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id={`amount-${issue.id}`}
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount saved in Rand (optional)"
                  className={`${svcInput} flex-1`}
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center bg-svc-ink px-4 text-sm font-semibold text-white hover:bg-svc-green"
                >
                  I used this
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

