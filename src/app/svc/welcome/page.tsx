import type { Metadata } from "next";
import Link from "next/link";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { svcBtnGreen } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

// Paystack's callback lands here. The webhook does the activating; this
// page only greets, so a slow webhook shows "being confirmed" rather than
// pretending.
export default async function WelcomePage() {
  const member = await getCurrentMember();
  const accountHref = await svcPath("/account");
  const homeHref = await svcPath("/");

  return (
    <div className="bg-svc-green px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-svc-heading text-3xl font-bold">
          {member ? `Welcome, ${member.first_name}` : "Welcome"}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/85">
          Thank you for joining Smart Value Club. Your payment is being
          confirmed, and your confirmation email is on its way. Your benefits
          arrive with the next monthly issue on the 1st.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={member ? accountHref : homeHref} className={svcBtnGreen}>
            {member ? "Open my account" : "Back to the site"}
          </Link>
        </div>
      </div>
    </div>
  );
}
