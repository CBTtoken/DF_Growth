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
    alt: "A South African small business owner at work in their business",
    width: 1100,
    height: 825,
  },
  soundFamiliar: {
    src: "/home/sound-familiar.jpg",
    alt: "A small business owner keeping up with customer messages",
    width: 1000,
    height: 750,
  },
  doMore: {
    src: "/home/do-more.jpg",
    alt: "A small business owner preparing a customer order",
    width: 1000,
    height: 563,
  },
} satisfies Record<string, HomeImage>;
