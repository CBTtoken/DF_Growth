// Legacy Reactivation Sprint 1, Section 6: a separate 5-state lifecycle for
// this batch only (built / invitation sent / trial active / trial expired /
// converted to paying), distinct from describeGrowthClientStatus which
// isn't a good fit here — this batch is created with status "active" and
// trial_ends_at null from day one (bypassing onboard/actions.ts's normal
// "trial starts at launch" flow), so the general label would just call
// every one of these 31 accounts "Trial" with no further distinction.
export type ReactivationStatusInput = {
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  paystack_reference: string | null;
};

export function describeReactivationStatus(input: ReactivationStatusInput): string {
  if (input.paystack_reference) return "Converted to paying";
  if (!input.trial_starts_at) return "Built";
  if (!input.trial_ends_at) return "Invitation sent";
  return new Date(input.trial_ends_at) > new Date() ? "Trial active" : "Trial expired";
}
