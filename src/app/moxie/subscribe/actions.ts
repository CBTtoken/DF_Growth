"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getReader } from "@/lib/moxie/entitlement";
import { initializeMembershipCheckout, type MoxieInterval } from "@/lib/moxie/membership";
import { isMoxieHost, moxiePath, MOXIE_ORIGIN } from "@/lib/moxie/host";

export async function startMembership(formData: FormData) {
  const raw = String(formData.get("interval") ?? "monthly");
  const interval: MoxieInterval = raw === "annual" ? "annual" : "monthly";

  const reader = await getReader();
  if (!reader) {
    // Sent to sign-in and brought straight back with the choice preserved,
    // so picking a plan and then being made to start again does not happen.
    redirect(
      await moxiePath(
        `/login?mode=join&next=${encodeURIComponent(`/subscribe?interval=${interval}`)}`
      )
    );
  }

  // The callback has to come back on whichever hostname the reader is
  // actually on. Before the DNS moves, that is the Growth domain; after it,
  // moxiemag.co.za. Sending them to a domain that does not resolve yet, or
  // bouncing them onto a different one mid-payment, is how a completed
  // payment ends on an error page.
  const host = (await headers()).get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const origin = isMoxieHost(host) ? MOXIE_ORIGIN : `${proto}://${host}`;
  const callbackUrl = `${origin}${await moxiePath("/welcome")}`;

  const result = await initializeMembershipCheckout({
    email: reader.email,
    userId: reader.id,
    interval,
    callbackUrl,
  });

  if ("error" in result) {
    redirect(await moxiePath("/subscribe?error=checkout"));
  }

  redirect(result.authorizationUrl);
}
