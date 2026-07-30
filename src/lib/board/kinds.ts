// The Board, Phase 1. What a member is actually posting.
//
// Four kinds, one composer. Dewald's decision on 30 July: a member should
// never have to choose a form before he can start typing, so the kind is a
// single tap on an already-open form, and it does two jobs afterwards. It
// labels the post, and it is a browse path ("show me what is for sale"),
// which is most of why a stranger lands on the board at all.
//
// Adding a fifth kind means a migration, because the check constraint on
// board_posts.kind lists them. That is deliberate: a free-text kind would
// be four spellings of "for sale" inside a month.
export type PostKind = "offer" | "for_sale" | "update" | "job_done";

export type PostKindMeta = {
  id: PostKind;
  /** Shown on the card, in the filter bar and in the page title. */
  label: string;
  /** Shown next to the choice in the composer, so a member picks the right one without guessing. */
  hint: string;
  /** Used in the URL, /board?kind=for-sale, and nowhere else. */
  param: string;
};

export const POST_KINDS: PostKindMeta[] = [
  {
    id: "offer",
    label: "Offer",
    hint: "A special, a deal or a price you are running right now",
    param: "offer",
  },
  {
    id: "for_sale",
    label: "For sale",
    hint: "A specific item or stock you want to sell",
    param: "for-sale",
  },
  {
    id: "update",
    label: "Update",
    hint: "News from the business. New hours, a new service, where you will be this week",
    param: "update",
  },
  {
    id: "job_done",
    label: "Job done",
    hint: "Work you have finished. The strongest thing you can post, because it is proof",
    param: "job-done",
  },
];

export function kindMeta(kind: string): PostKindMeta | null {
  return POST_KINDS.find((k) => k.id === kind) ?? null;
}

export function kindLabel(kind: string): string {
  return kindMeta(kind)?.label ?? "Post";
}

/** Resolves ?kind=for-sale back to the stored value. Returns null for anything unrecognised. */
export function kindFromParam(param: string | undefined): PostKind | null {
  if (!param) return null;
  return POST_KINDS.find((k) => k.param === param)?.id ?? null;
}
