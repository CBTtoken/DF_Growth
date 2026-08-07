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

export type ReadinessItem = {
  key: string;
  label: string;
  hint: string;
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
  const items: ReadinessItem[] = [];

  // Only asked when the member's own theme actually renders a hero photo,
  // and only once they have photos to choose between. On a theme with no
  // hero photo this is not a gap, it is simply not a question.
  if (isPhotoLedTemplate(input.template) && input.photoCount > 0) {
    items.push({
      key: "hero",
      label: "Choose your front-page photo",
      hint: "Your page style shows one big photo at the top. Pick the one you want there.",
      href: "/dashboard",
      done: Boolean(input.heroPhotoId),
    });
  }

  items.push({
    key: "photos",
    label: `Add at least ${GOOD_PHOTO_COUNT} photos`,
    hint: "Real photos of your work are what make a customer believe you before they read a word.",
    href: "/dashboard",
    done: input.photoCount >= GOOD_PHOTO_COUNT,
  });

  items.push({
    key: "whatsapp",
    label: "Add your WhatsApp number",
    hint: "Most customers would rather message than call, and every page puts this button up front.",
    href: "/dashboard/edit",
    done: Boolean(input.whatsappPhone?.trim()),
  });

  items.push({
    key: "address",
    label: "Say where you work",
    hint: "In plain words, the town or areas you cover. This is what local searches match on.",
    href: "/dashboard/edit",
    done: Boolean(input.businessAddress?.trim()),
  });

  items.push({
    key: "tagline",
    label: "Add a short tagline",
    hint: "One line under your name saying what you do.",
    href: "/dashboard/edit",
    done: Boolean(input.tagline?.trim()),
  });

  items.push({
    key: "description",
    label: "Describe your business",
    hint: "A short paragraph in your own words. It also feeds what Google shows about you.",
    href: "/dashboard/edit",
    done: Boolean(input.businessDescription?.trim()),
  });

  return items;
}
