// Combined spec Sec 11: a human-readable status for the admin table and CSV
// export — the raw growth_clients.status column (pending_intake / active /
// paused / cancelled) doesn't distinguish a still-on-trial Foundation
// client from a genuinely paying one, and gives no sense of how far a
// pending_intake signup actually got. Deliberately a separate, independent
// computation from onboard/page.tsx's own resume-step logic rather than a
// shared import — this is read-only display for Dewald, not something that
// drives what a client actually sees or can do next, so it's safer for the
// two to be able to drift slightly than for an admin-page change to risk
// touching the real onboarding resume flow.
const NON_FOUNDATION_STEP_LABELS = [
  "Business info",
  "Business profile",
  "Brand kit",
  "Photos",
  "Template",
  "Landing copy",
  "Packages",
  "Meta ad connect",
  "Payment",
];
const FOUNDATION_STEP_LABELS = ["Business info", "Business profile", "Brand kit", "Photos", "Template", "Landing copy", "Packages"];

export type AdminStatusInput = {
  plan: string;
  status: string;
  paystack_reference: string | null;
  contact_email: string | null;
  business_description: string | null;
  brand_primary_color: string | null;
  template: string | null;
  has_landing_page: boolean;
  packages: unknown;
  meta_pixel_id: string | null;
  meta_setup_requested_help: boolean;
};

function lastCompletedStep(input: AdminStatusInput): number {
  let step = 1;
  if (input.contact_email) step = 2;
  if (input.business_description) step = 3;
  if (input.brand_primary_color) step = 4;
  if (input.template !== null) step = 5;
  if (input.has_landing_page) step = 6;
  if (input.packages !== null) step = 7;
  if (input.plan !== "foundation" && (input.meta_pixel_id !== null || input.meta_setup_requested_help)) step = 9;
  return step;
}

export function describeGrowthClientStatus(input: AdminStatusInput): string {
  if (input.status === "cancelled") return "Cancelled";
  if (input.status === "paused") return "Trial lapsed";
  if (input.status === "active") {
    // Foundation's trial goes live (status active) with no charge ever
    // having happened — paystack_reference is the one field that only
    // gets set once a real payment lands, whether that's the original
    // Growth/Enterprise signup or a later trial conversion.
    if (input.plan === "foundation" && !input.paystack_reference) return "Trial";
    return "Active";
  }
  const labels = input.plan === "foundation" ? FOUNDATION_STEP_LABELS : NON_FOUNDATION_STEP_LABELS;
  const step = Math.min(lastCompletedStep(input), labels.length);
  return `Incomplete — step ${step} of ${labels.length}: ${labels[step - 1]}`;
}
