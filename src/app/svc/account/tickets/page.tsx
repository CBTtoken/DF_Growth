import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { verifySvcTransaction } from "@/lib/svc/payments";
import { recordTicketPurchase } from "@/lib/svc/draw-purchase";
import { svcBtnGreen } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Draw entries",
  robots: { index: false, follow: false },
};

// Paystack's callback for ticket purchases: verify the reference, record
// the purchase and its entries, deduplicated so the webhook seeing the
// same payment changes nothing.
export default async function TicketsReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const member = await getCurrentMember();
  if (!member) redirect(`${await svcPath("/login")}`);

  let outcome: "recorded" | "frozen" | "failed" = "failed";
  const reference = params.reference ?? params.trxref;
  if (reference) {
    const verified = await verifySvcTransaction(reference);
    if (
      verified &&
      verified.metadata.kind === "svc_draw_tickets" &&
      verified.metadata.svc_member_id === member!.id &&
      verified.metadata.svc_draw_id
    ) {
      const count = Number(verified.metadata.svc_ticket_count ?? 0);
      const result = await recordTicketPurchase({
        drawId: verified.metadata.svc_draw_id,
        memberId: member!.id,
        count: count > 0 ? count : 1,
        amountCents: verified.amountCents,
        reference: verified.reference,
      });
      if (result.ok) outcome = result.entriesMinted === false ? "frozen" : "recorded";
    }
  }

  const accountHref = await svcPath("/account");

  return (
    <div className="bg-svc-blue px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-svc-heading text-3xl font-bold">
          {outcome === "recorded" ? "Entries added" : outcome === "frozen" ? "The draw had already closed" : "Something went wrong"}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/85">
          {outcome === "recorded" &&
            "Your extra entries are in this month's draw. Good luck; the result is published for everyone to check."}
          {outcome === "frozen" &&
            "Your payment arrived after the entries froze, so no entries were added. We will refund it; you do not need to do anything."}
          {outcome === "failed" &&
            "The payment could not be confirmed. If you were charged, contact us and we will put it right."}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={accountHref} className={svcBtnGreen}>
            Back to my dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
