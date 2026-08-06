// What a post is, and what a post of that kind actually needs.
//
// This went through three versions before it was right, and the third one
// is Dewald's.
//
// Version one asked a member to choose between four kinds, each with a hint
// paragraph, before he could type a word. Too complicated, and he was right.
// Version two stripped the form to a heading and a box. Simpler, but it
// threw away the thing that made each kind useful: a price matters when
// something is for sale and is meaningless when somebody is looking for a
// plumber.
//
// So the kind is the first question, and it is the only question, because
// answering it decides the whole rest of the form. Somebody selling a fridge
// gets a price box. Somebody looking for a plumber does not. Nobody is ever
// shown a field that does not apply to what they are doing.

export type PostKind = "special" | "offer" | "for_sale" | "looking_for";

export type PostCondition = "new" | "like_new" | "good" | "for_parts";
export type PostUrgency = "asap" | "this_week" | "flexible";

export const CONDITION_OPTIONS: { id: PostCondition; label: string }[] = [
  { id: "new", label: "New" },
  { id: "like_new", label: "Like new" },
  { id: "good", label: "Good" },
  { id: "for_parts", label: "For parts" },
];

export const URGENCY_OPTIONS: { id: PostUrgency; label: string }[] = [
  { id: "asap", label: "As soon as possible" },
  { id: "this_week", label: "This week" },
  { id: "flexible", label: "No rush" },
];

export type PostKindMeta = {
  id: PostKind;
  /** On the card, the filter and the page title. */
  label: string;
  /** On the New post picker, so the choice explains itself. */
  pickerLabel: string;
  pickerHint: string;
  /** Who may post it. Money-attached kinds are member-only, checked again at the database. */
  author: "member" | "public" | "both";
  /** In the URL, /board?kind=for-sale, and nowhere else. */
  param: string;
  /** The one-line heading, which is also the page title and the share card. */
  titleLabel: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  /** A price box only where a price means something. */
  showPrice: boolean;
  /** An offer/special needs a price or a saving described in words, not necessarily both. */
  requiresPriceOrSaving: boolean;
  /** Whether a business posts this as itself. Looking for is always personal. */
  businessByDefault: boolean;
  /** A for-sale post is not a post without something to look at. */
  requiresPhoto: boolean;
  requiresCondition: boolean;
  /** An offer with no end date is not an offer. */
  requiresEndDate: boolean;
  requiresUrgency: boolean;
};

export const POST_KINDS: PostKindMeta[] = [
  {
    id: "special",
    label: "Special",
    pickerLabel: "A special",
    pickerHint: "A deal you are running now",
    author: "member",
    param: "special",
    titleLabel: "What is on special",
    titlePlaceholder: "Two rooms painted for the price of one",
    bodyPlaceholder: "The details. What is included, and until when.",
    showPrice: true,
    requiresPriceOrSaving: true,
    businessByDefault: true,
    requiresPhoto: false,
    requiresCondition: false,
    requiresEndDate: true,
    requiresUrgency: false,
  },
  {
    id: "offer",
    label: "Offer",
    pickerLabel: "Something you offer",
    pickerHint: "A service you want people to know about",
    author: "member",
    param: "offer",
    titleLabel: "What are you offering",
    titlePlaceholder: "Same day geyser replacement",
    bodyPlaceholder: "The details. What is included, how long it takes, which areas you cover.",
    showPrice: true,
    requiresPriceOrSaving: true,
    businessByDefault: true,
    requiresPhoto: false,
    requiresCondition: false,
    requiresEndDate: true,
    requiresUrgency: false,
  },
  {
    id: "for_sale",
    label: "For sale",
    pickerLabel: "Something for sale",
    pickerHint: "An item you are selling",
    // Money attached, so a member only, same as offer and special. A
    // signed-in member can still post it as himself rather than his
    // business (see "asMyself" in the composer) -- what changes here is
    // that a stranger with no account can no longer post one at all.
    author: "member",
    param: "for-sale",
    titleLabel: "What are you selling",
    titlePlaceholder: "Defy double door fridge, working",
    bodyPlaceholder: "Condition, age, and anything a buyer should know.",
    showPrice: true,
    requiresPriceOrSaving: false,
    businessByDefault: true,
    requiresPhoto: true,
    requiresCondition: true,
    requiresEndDate: false,
    requiresUrgency: false,
  },
  {
    id: "looking_for",
    label: "Looking for",
    pickerLabel: "Looking for something",
    pickerHint: "You need somebody, or you are looking to buy",
    author: "both",
    param: "looking-for",
    titleLabel: "What are you looking for",
    titlePlaceholder: "Plumber for a burst geyser, Centurion",
    bodyPlaceholder: "Explain what you need, and when you need it.",
    // Somebody looking for a plumber has no price to give, and asking for
    // one would only make them guess.
    showPrice: false,
    requiresPriceOrSaving: false,
    // Always personal. A business looking for a plumber is a person looking
    // for a plumber.
    businessByDefault: false,
    requiresPhoto: false,
    requiresCondition: false,
    requiresEndDate: false,
    requiresUrgency: true,
  },
];

/** What a signed-in member may post. All of them. */
export const MEMBER_KINDS = POST_KINDS.filter((k) => k.author === "member" || k.author === "both");

/** What somebody who is not signed in may post. */
export const PUBLIC_KINDS = POST_KINDS.filter((k) => k.author === "public" || k.author === "both");

export function kindMeta(kind: string): PostKindMeta | null {
  return POST_KINDS.find((k) => k.id === kind) ?? null;
}

export function kindLabel(kind: string): string {
  return kindMeta(kind)?.label ?? "Post";
}

/** Resolves ?kind=for-sale back to the stored value. Null for anything unrecognised. */
export function kindFromParam(param: string | undefined): PostKind | null {
  if (!param) return null;
  return POST_KINDS.find((k) => k.param === param)?.id ?? null;
}
