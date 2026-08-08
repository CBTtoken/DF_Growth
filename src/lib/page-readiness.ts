import { isPhotoLedTemplate } from "@/lib/templates/recommend";

// Sprint "Onboarding two doors" item 5: the friendly pre-publish checklist.
//
// Every item is a nudge, never a blocker. Nothing here stops a page going
// live, because a live page with a missing tagline still sells more than a
// page held back until it is perfect. The handoff allows blocking only
// where the page would actually be broken, and none of these break it: the
// fallback photo, the business name and the lead form all render regardless.
//
// Pure and server-safe so the dashboard card and any later surface (the
// wizard's finish screen) read from one definition instead of drifting into
// two different opinions about what "ready" means.
//
// Sprint "Member dashboard navigation", 8 August 2026: every item now names
// the Your page section that fixes it, and the href is derived from that
// name rather than typed out per item. Before this, four items pointed at
// /dashboard/edit and two at /dashboard#photos, and the second pair went
// nowhere at all: the photos live in a tab that was not mounted on load, so
// the anchor had nothing to scroll to. One mapping, one link builder, no
// way for the two to disagree again.

/**
 * The six sections of Your page, in the order a member sees them. Agreed
 * with Dewald 8 August 2026: named the way he would say them out loud, not
 * the way the wizard steps are numbered.
 */
export type PageSectionKey = "photos" | "look" | "details" | "about" | "words" | "prices";

export const PAGE_SECTION_ORDER: PageSectionKey[] = [
  "photos",
  "look",
  "details",
  "about",
  "words",
  "prices",
];

/** Deep link straight at one open section of Your page. */
export function pageSectionHref(section: PageSectionKey) {
  return `/dashboard?tab=your-page&open=${section}`;
}

export type ReadinessItem = {
  key: string;
  label: string;
  hint: string;
  section: PageSectionKey;
  href: string;
  done: boolean;
};

export type ReadinessInput = {
  template: string | null;
  heroPhotoId: string | null;
  photoCount: number;
  whatsappPhone: string | null;
  businessAddress: string | null;
  tagline: string | null;
  businessDescription: string | null;
};

// Five photos is the point where a gallery stops looking like an
// afterthought: below that the templates that lay photos out in a grid
// leave visible gaps. Davemarly shipped with fifteen.
const GOOD_PHOTO_COUNT = 5;

export function pageReadiness(input: ReadinessInput): ReadinessItem[] {
  const items: Omit<ReadinessItem, "href">[] = [];

  // Only asked when the member's own theme actually renders a hero photo,
  // and only once they have photos to choose between. On a theme with no
  // hero photo this is not a gap, it is simply not a question.
  if (isPhotoLedTemplate(input.template) && input.photoCount > 0) {
    items.push({
      key: "hero",
      label: "Choose your front-page photo",
      hint: 'Your page style shows one big photo at the top. Tap "Front page" on the one you want there.',
      // Dewald, 8 August 2026: tapping an item dropped him at the top of
      // the dashboard with no clue where to go next. These open the section
      // that fixes them and scroll to it.
      section: "photos",
      done: Boolean(input.heroPhotoId),
    });
  }

  items.push({
    key: "photos",
    label: `Add at least ${GOOD_PHOTO_COUNT} photos`,
    hint: "Real photos of your work are what make a customer believe you before they read a word.",
    section: "photos",
    done: input.photoCount >= GOOD_PHOTO_COUNT,
  });

  items.push({
    key: "whatsapp",
    label: "Add your WhatsApp number",
    hint: "Most customers would rather message than call, and every page puts this button up front.",
    section: "details",
    done: Boolean(input.whatsappPhone?.trim()),
  });

  items.push({
    key: "address",
    label: "Say where you work",
    hint: "In plain words, the town or areas you cover. This is what local searches match on.",
    section: "about",
    done: Boolean(input.businessAddress?.trim()),
  });

  items.push({
    key: "tagline",
    label: "Add a short tagline",
    hint: "One line under your name saying what you do.",
    section: "about",
    done: Boolean(input.tagline?.trim()),
  });

  items.push({
    key: "description",
    label: "Describe your business",
    hint: "A short paragraph in your own words. It also feeds what Google shows about you.",
    section: "about",
    done: Boolean(input.businessDescription?.trim()),
  });

  return items.map((item) => ({ ...item, href: pageSectionHref(item.section) }));
}

/**
 * What each Your page section shows in its header: a green tick when there
 * is nothing left to add, or a count of what is outstanding.
 *
 * Derived from `pageReadiness` wherever an item exists for that section, so
 * the checklist on Home and the ticks on Your page can never disagree about
 * the same field. The three sections with no checklist item of their own
 * (your look, your words, your prices) are judged on their own fields
 * being filled in, which is the same question asked directly.
 */
export type SectionStatusInput = ReadinessInput & {
  headline: string | null;
  subheadline: string | null;
  aboutText: string | null;
  packageCount: number;
};

export type SectionStatus = {
  /** Nothing left to add here. Renders a green tick. */
  done: boolean;
  /** Checklist items still outstanding in this section. Renders a count. */
  outstanding: number;
};

export function pageSectionStatus(
  input: SectionStatusInput
): Record<PageSectionKey, SectionStatus> {
  const items = pageReadiness(input);
  const outstandingIn = (section: PageSectionKey) =>
    items.filter((i) => i.section === section && !i.done).length;
  const hasItems = (section: PageSectionKey) => items.some((i) => i.section === section);
  const fromChecklist = (section: PageSectionKey): SectionStatus => ({
    done: hasItems(section) && outstandingIn(section) === 0,
    outstanding: outstandingIn(section),
  });

  const filled = (value: string | null) => Boolean(value?.trim());

  return {
    photos: fromChecklist("photos"),
    // Every member has a page style and two brand colours from the moment
    // they finish signing up, so there is never anything outstanding here.
    // A tick that says "nothing missing" rather than "you did a thing".
    look: { done: true, outstanding: 0 },
    details: fromChecklist("details"),
    about: fromChecklist("about"),
    words: {
      done: filled(input.headline) && filled(input.subheadline) && filled(input.aboutText),
      outstanding: 0,
    },
    // Genuinely optional. No packages is a valid finished state, so an
    // empty one shows no badge at all rather than a nag.
    prices: { done: input.packageCount > 0, outstanding: 0 },
  };
}
