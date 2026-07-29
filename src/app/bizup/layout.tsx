import type { Metadata } from "next";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpNav } from "@/components/bizup/BizUpNav";

// Meta's proof that katisobiz.co.za belongs to DigitalFlyer, supplied by
// Dewald from Business Manager on 28 July 2026.
//
// Not a secret. It is a public token whose entire purpose is to be readable
// in the page source, which is why it is written here rather than held in an
// environment variable.
//
// Without it Meta under-reports conversions from iOS users, so a campaign
// looks like it is performing worse than it is and the temptation is to
// switch off ads that were actually working.
//
// Placed on the layout rather than the landing page so every KatisoBiz page
// carries it. Verification only checks the domain root today, but a tag that
// exists on one page and not the rest is the kind of thing that quietly
// breaks when that one page is restructured.
//
// Growth's own domain is verified separately and does not use this value.
// The appleWebApp block below is what makes an iPhone treat this as an
// installed app rather than a Safari bookmark. Apple ignores the web
// manifest almost entirely: it reads its own tags for the icon, the title
// under the icon, and whether to open without the browser bar. Android
// reads the manifest and ignores these. Both are needed.
export const metadata: Metadata = {
  other: { "facebook-domain-verification": "4xxcblvnpq67238mlcrpuzxxc3yih0" },
  appleWebApp: {
    capable: true,
    title: "KatisoBiz",
    // Draws the page behind the clock and battery, tinted by the theme
    // colour, instead of leaving a grey strip above the header.
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Apple does not read the manifest's icon list. Without this it
    // screenshots the page and uses that as the home screen icon, which
    // looks like a mistake.
    apple: [{ url: "/katisobiz/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// Colours the phone's own status bar to match the header, so the app does
// not open with a white band above it. Separate from metadata because Next
// treats the theme colour as viewport configuration.
export const viewport = {
  themeColor: "#1081b8",
};

// Mounts the navigation once, for every signed-in member, on every page.
//
// Dewald: "when I click on either, the menu options goes away, can we have
// all pages have some decent navigation options?" That is what this fixes,
// and it is the more important half of the navigation rework. Placement was
// wrong; navigation vanishing the moment you use it was broken.
//
// It appears only for a member who actually has a KatisoBiz account, so the
// landing page, login, signup and the customer's public document link are
// all untouched. A customer opening a quote is not a member and must not
// see a member's navigation.
export default async function BizUpLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessName: string | null = null;
  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bizup_accounts")
      .select("business_name")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    businessName = data?.business_name ?? null;
  }

  return (
    <>
      {businessName !== null && <BizUpNav businessName={businessName} />}
      {children}
    </>
  );
}
