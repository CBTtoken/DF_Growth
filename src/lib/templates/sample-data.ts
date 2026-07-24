// Generic, realistic content used only to render live template previews
// (src/app/preview/[templateId]) — never written to a real growth_clients
// row. A believable South African small business rather than lorem ipsum,
// so a non-technical client sees what an actual page looks like, not a
// wireframe.
export const SAMPLE_DATA = {
  businessName: "Thabo's Plumbing Co.",
  tagline: "Fast, reliable plumbing for Joburg homes.",
  headline: "24/7 Emergency Plumbing You Can Trust",
  subheadline: "Burst pipes, blocked drains, geyser repairs — we're there when you need us most.",
  ctaLabel: "Get a Free Quote",
  primaryColor: "#1081b8",
  secondaryColor: "#ffffff",
  aboutText:
    "Thabo's Plumbing has served Johannesburg homes and businesses for over 8 years. Every job gets the same attention, whether it's a dripping tap or a full geyser replacement.",
  additionalNotes:
    "Started in 2016 with one van and a toolbox. Today we're a team of six, still answering our own phones and still showing up on time.",
  servicesText: "Emergency Leak Repairs\nDrain Unblocking\nGeyser Installation\nPipe Relining",
  businessAddress: "142 Main Road, Sandton, Johannesburg",
  industry: "Plumbing",
  packages: [
    { name: "Callout & Diagnosis", price: "R350", description: "A qualified plumber at your door within the hour." },
    { name: "Standard Repair", price: "From R650", description: "Most common repairs, parts and labour included." },
    { name: "Geyser Replacement", price: "From R4,200", description: "Full installation, old unit removed." },
  ],
  testimonials: [
    { id: "1", author_name: "Sarah M.", quote: "Came out within the hour on a Sunday. Lifesavers.", rating: 5 },
    { id: "2", author_name: "David K.", quote: "Fair pricing, no surprises on the bill.", rating: 5 },
  ],
  photoUrl: "https://images.pexels.com/photos/1153213/pexels-photo-1153213.jpeg?auto=compress&cs=tinysrgb&w=1200",
  // Dark Mode pilot rebuild: PhotoGallerySection requires 2+ photos to
  // render anything, and the preview route previously had no "gallery"
  // case at all — storage_path holds the path-after-domain so it
  // concatenates with the local galleryStorageBase constant in the preview
  // page into a valid Pexels URL, without needing to touch
  // PhotoGallerySection.tsx itself.
  photos: [
    { id: "1", storage_path: "photos/1153213/pexels-photo-1153213.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    { id: "2", storage_path: "photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  ],
  reviews: [
    {
      id: "1",
      rating: 5,
      review_text: "Same-day callout, fixed the leak in under an hour. Would recommend to anyone.",
      business_reply: null,
      created_at: "2026-06-02T10:00:00Z",
      reviewer_accounts: { display_name: "Nomvula T." },
    },
    {
      id: "2",
      rating: 4,
      review_text: "Good work on the geyser install, just took a little longer than quoted.",
      business_reply: "Thanks for the patience, Peter — we've since added a second van for busier weeks.",
      created_at: "2026-05-18T10:00:00Z",
      reviewer_accounts: { display_name: "Peter K." },
    },
  ],
};
