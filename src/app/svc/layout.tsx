import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { isSvcHost, SVC_ORIGIN, SVC_PREFIX } from "@/lib/svc/host";
import { SvcHeader } from "@/components/svc/SvcHeader";
import { SvcFooter } from "@/components/svc/SvcFooter";

// The two faces the SVC handoff section 4 allows: clean sans serif
// throughout, Montserrat or Poppins. Declared here rather than in the root
// layout so no Growth, KatisoBiz or Moxie page downloads a font only SVC
// renders, the same reasoning src/app/moxie/layout.tsx records.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

// metadataBase is SVC's own domain and not the current hostname, so every
// canonical and og:image resolves to smartvalueclub.co.za even while the
// site is reviewed on a preview URL.
//
// The description states face value as face value, per handoff section 12.
// No "verified savings" claim anywhere until the ledger can evidence one.
export const metadata: Metadata = {
  metadataBase: new URL(SVC_ORIGIN),
  // absolute rather than default, because a child layout's own title still
  // resolves through the PARENT's template: with default, every SVC tab
  // read "... | DigitalFlyer Growth", which is another company's name on
  // SVC's window. Verified against the dev server before this comment was
  // written. The template below applies to SVC's child pages only.
  title: {
    absolute: "Smart Value Club | Grocery coupon membership for South African households",
    template: "%s | Smart Value Club",
  },
  description:
    "A South African membership club. Monthly grocery and pharmacy coupons for Dis-Chem, Checkers, Shoprite and Pick n Pay, the Moxie digital magazine, and a monthly members draw. Cancel anytime.",
  applicationName: "Smart Value Club",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Smart Value Club",
    locale: "en_ZA",
    url: SVC_ORIGIN,
    title: "Smart Value Club | Grocery coupon membership for South African households",
    description:
      "Monthly grocery and pharmacy coupons for the stores you already shop at, the Moxie digital magazine, and a monthly members draw. Cancel anytime.",
  },
};

export default async function SvcLayout({ children }: { children: React.ReactNode }) {
  // "" on smartvalueclub.co.za where the proxy strips the prefix, "/svc"
  // on the Growth hostname and preview URLs where the prefix is what makes
  // the route reachable. Computed once here so the header and footer never
  // guess at hostnames.
  const host = (await headers()).get("host") ?? "";
  const prefix = isSvcHost(host) ? "" : SVC_PREFIX;

  // Session state for the header, so a signed-in member sees "My
  // dashboard" instead of "Log in", and an admin always has a way back to
  // admin from any screen. Without this the header read as "logged out"
  // the moment anyone left the member area, which was reported as a bug
  // because it genuinely looked like one.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user;
  let isAdmin = false;
  if (signedIn) {
    const { getSvcAdmin } = await import("@/lib/svc/admin");
    isAdmin = !!(await getSvcAdmin());
  }

  return (
    // bg-svc-cream because plain white page backgrounds are banned (handoff
    // section 4). font-svc-body is a Tailwind utility rather than an inline
    // var() on purpose: the tokens live in an @theme inline block, which
    // substitutes values into utilities instead of emitting custom
    // properties, so a style prop var() would silently resolve to nothing.
    // That exact failure already shipped once on the Moxie layout.
    <div
      className={`${montserrat.variable} ${poppins.variable} flex min-h-full flex-1 flex-col bg-svc-cream font-svc-body text-svc-ink`}
    >
      <SvcHeader prefix={prefix} signedIn={signedIn} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
      <SvcFooter prefix={prefix} />
    </div>
  );
}
