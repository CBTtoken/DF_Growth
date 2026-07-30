// What a post is, kept to the smallest set that still gives a browse path.
//
// It started as four, each with a hint paragraph explaining when to use it,
// and Dewald called it complicated the first time he used it. He was right:
// "Job done" and "Update" made a member answer a question about categories
// before he could type a word, and the people this is for are used to
// Facebook, where there is one box and no question at all.
//
// So the kind is now an optional tag rather than a decision. A member who
// taps nothing gets "Special", which is what most posts are anyway.

export type PostKind = "special" | "offer" | "for_sale" | "looking_for";

export type PostKindMeta = {
  id: PostKind;
  label: string;
  /** Which side of the board may post it. */
  author: "member" | "public";
  /** Used in the URL, /board?kind=for-sale, and nowhere else. */
  param: string;
};

export const POST_KINDS: PostKindMeta[] = [
  { id: "special", label: "Special", author: "member", param: "special" },
  { id: "offer", label: "Offer", author: "member", param: "offer" },
  { id: "for_sale", label: "For sale", author: "member", param: "for-sale" },
  // The public side. "Looking for" rather than "Need", Dewald's wording, and
  // the better one: it is what somebody actually types into a group.
  { id: "looking_for", label: "Looking for", author: "public", param: "looking-for" },
];

/** What a business may choose from. Three, and one is already selected. */
export const MEMBER_KINDS = POST_KINDS.filter((k) => k.author === "member");

/** What a member of the public may post. */
export const PUBLIC_KINDS: PostKindMeta[] = [
  POST_KINDS.find((k) => k.id === "looking_for")!,
  POST_KINDS.find((k) => k.id === "for_sale")!,
];

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
