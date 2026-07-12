// Combined spec Sec 25: the testimonial-only graphic generator expanded to
// 5 distinct content types. Testimonial keeps its own existing dedicated
// flow (src/app/dashboard/actions.ts addTestimonial) since it's tied to a
// real stored testimonial, not just one-off text — these four are the new
// ones, generated from whatever's typed into the form each time, nothing
// stored beyond the resulting image.
export type AssetContentType = "special-offer" | "announcement" | "before-after" | "new-arrival";

export const ASSET_CONTENT_TYPES: {
  id: AssetContentType;
  name: string;
  headlineLabel: string;
  headlinePlaceholder: string;
  subtextLabel: string;
  subtextPlaceholder: string;
}[] = [
  {
    id: "special-offer",
    name: "Special Offer",
    headlineLabel: "Offer",
    headlinePlaceholder: "e.g. 20% off all callouts this week",
    subtextLabel: "Details",
    subtextPlaceholder: "e.g. Valid until 30 July, mention this post",
  },
  {
    id: "announcement",
    name: "Announcement",
    headlineLabel: "Headline",
    headlinePlaceholder: "e.g. We're now open Saturdays!",
    subtextLabel: "Details",
    subtextPlaceholder: "e.g. 8am to 1pm, same great service",
  },
  {
    id: "before-after",
    name: "Before & After",
    headlineLabel: "Caption",
    headlinePlaceholder: "e.g. Another kitchen transformation",
    subtextLabel: "",
    subtextPlaceholder: "",
  },
  {
    id: "new-arrival",
    name: "New Arrival",
    headlineLabel: "What's new",
    headlinePlaceholder: "e.g. Introducing our tankless water heaters",
    subtextLabel: "Details",
    subtextPlaceholder: "e.g. Book a free consultation this month",
  },
];
