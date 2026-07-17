// Sec 2a: 30-day attribution window, the spec's own recommended default
// ("matching common practice"). Shared between the /r/[code] route that
// sets this cookie and pricing/actions.ts, which reads it at signup.
export const REFERRAL_COOKIE_NAME = "df_referral_code";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
