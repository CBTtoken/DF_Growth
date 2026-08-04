// Every photo used on the home page lives here, in one place, so the images
// can be swapped without touching a single component.
//
// TO REPLACE AN IMAGE, either:
//   (a) drop a new file into /public/home/ using the SAME filename below
//       (e.g. overwrite /public/home/hero.jpg) and change nothing here, or
//   (b) point `src` at a different path or an https URL. Local /public paths
//       need no extra config; a new remote host would also need adding to
//       next.config.ts `images.remotePatterns`.
//
// Keep the `alt` text honest to whatever the picture actually shows (it is
// read aloud by screen readers and shown if the image fails to load).
//
// The three starter images are the ones from the Bolt design, saved locally.
// They are placeholders to be replaced with better, race-neutral, informal
// small-business photography.

export type HomeImage = {
  src: string;
  alt: string;
  /** Intrinsic size of the file on disk, so next/image can reserve space
      and avoid layout shift. Update if you swap in a differently sized file. */
  width: number;
  height: number;
};

export const HOME_IMAGES = {
  hero: {
    src: "/home/hero.jpg",
    alt: "A South African salon owner smiling and holding an open for business sign",
    width: 1100,
    height: 1100,
  },
  soundFamiliar: {
    src: "/home/sound-familiar.jpg",
    alt: "A South African tradesman smiling proudly with his tools",
    width: 1100,
    height: 1100,
  },
  doMore: {
    src: "/home/do-more.jpg",
    alt: "A small business owner preparing a customer order",
    width: 1000,
    height: 563,
  },
  // The three "what you get" cards, added 4 Aug 2026 for the home page
  // split. All real: Buffelskop's live page and the live marketplace
  // captured via ScreenshotOne, the dashboard from Dewald's own screenshot
  // (docs/GrowthDashboard.png). No invented numbers anywhere, per the
  // handoff. (The KatisoBiz quote is not an image: the home page reuses
  // the KatisoBiz landing page's own HTML-rendered HeroDocument.)
  whatYouGetPage: {
    src: "/home/what-you-get-page.jpg",
    alt: "The Buffelskop member page open at phone size",
    width: 1600,
    height: 1000,
  },
  whatYouGetDashboard: {
    src: "/home/what-you-get-dashboard.jpg",
    alt: "A member dashboard showing real page views for the week",
    width: 1600,
    height: 1000,
  },
  whatYouGetMarketplace: {
    src: "/home/what-you-get-marketplace.jpg",
    alt: "The DigitalFlyer marketplace with member businesses listed",
    width: 1600,
    height: 1000,
  },
} satisfies Record<string, HomeImage>;
