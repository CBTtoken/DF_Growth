"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/agents/referral-cookie";

// Agent Programme Phase 1 Sec 1.8: "Visiting an agent page sets the
// existing referral cookie with that agent's referral code, using the same
// helper the current referral link uses. Do not build a second mechanism."
//
// Same cookie name and same 30-day window as /r/[code], imported from the
// same module rather than restated, so there is exactly one definition of
// what attribution is. It is written client-side because the agent page is
// statically rendered (revalidate = 60, same as every other public page
// here) and reading or writing cookies in the render path would force the
// whole route dynamic. That is safe to do from the browser precisely
// because this cookie was already deliberately made non-httpOnly for the
// /pricing confirmation banner.
//
// Sec 1.8, "where two agent codes are present, the most recent wins":
// this overwrites unconditionally, so the last agent page visited is the
// one that carries through to signup.
export function AgentAttribution({ referralCode }: { referralCode: string }) {
  useEffect(() => {
    document.cookie = [
      `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(referralCode)}`,
      `max-age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}`,
      "path=/",
      "samesite=lax",
      // Matches the server-set cookie. Dropped on http://localhost, where
      // the browser rejects a Secure cookie on an insecure origin, so
      // local testing still exercises the same path.
      window.location.protocol === "https:" ? "secure" : "",
    ]
      .filter(Boolean)
      .join("; ");
  }, [referralCode]);

  return null;
}
