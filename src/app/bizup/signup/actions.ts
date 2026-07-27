"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setActiveProductPreference } from "@/lib/bizup/product";
import { sendDigitalFlyerCapiEvent } from "@/lib/meta/digitalflyer-capi";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

// BizUp signup. Landing copy, conversion note 2: "The signup form is name,
// mobile number, password. Not company registration number, not VAT
// number, not address. Collect the rest inside the onboarding wizard once
// they are already committed. Every field on a signup form costs
// conversions, and this audience abandons fast."
//
// One deviation, and the reason for it: email is also collected. It cannot
// be dropped, because it is how the account is authenticated and how the
// member receives their own copies. Four fields, not three.

export type SignupState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(9, "Enter your mobile number"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function signUpForBizUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { businessName, email, phone, password } = parsed.data;

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`bizup-signup:${ip}`, 5, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes and try again."] } };
  }

  const admin = createAdminClient();

  // createUser, not inviteUserByEmail: the member is choosing a password
  // right now and should land straight in the product, not go and find an
  // email first. It also sends nothing, which matters because this runs on
  // every signup attempt.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    // An existing account is the one case worth naming specifically, since
    // "try again" would be useless advice.
    const already = createError?.message?.toLowerCase().includes("already");
    return {
      error: {
        _form: [
          already
            ? "There is already an account with that email. Log in instead."
            : "We couldn't create that account. Please try again.",
        ],
      },
    };
  }

  const { error: accountError } = await admin.from("bizup_accounts").insert({
    owner_user_id: created.user.id,
    business_name: businessName,
    email,
    phone,
  });

  if (accountError) {
    // Roll the auth user back rather than leaving a login with no account
    // behind it, which is the exact stranded state that has bitten this
    // project before on the Growth side.
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("Failed to create BizUp account at signup", accountError);
    return { error: { _form: ["We couldn't finish setting that up. Please try again."] } };
  }

  // Sign them straight in. They just chose this password, so there is no
  // reason to make them type it again.
  const supabase = await createServerClient();
  await supabase.auth.signInWithPassword({ email, password });
  await setActiveProductPreference("bizup");

  // Landing copy, conversion tracking: fire on the EXISTING DigitalFlyer
  // pixel, deduped with the browser pixel on a shared event_id threaded to
  // the thank-you page. Awaited rather than fired and forgotten, because
  // both bare promises and after() were tested on this deployment and
  // neither reliably completed.
  const eventId = crypto.randomUUID();
  const h = await headers();
  const host = h.get("host") ?? "bizup.digitalflyer.co.za";
  await sendDigitalFlyerCapiEvent({
    eventName: "CompleteRegistration",
    email,
    eventId,
    eventSourceUrl: `https://${host}/bizup/signup`,
    clientUserAgent: h.get("user-agent"),
    contentName: "bizup_free",
  });

  redirect(`/bizup/welcome?ev=${eventId}`);
}
