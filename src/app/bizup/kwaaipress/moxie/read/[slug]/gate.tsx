import { cookies } from "next/headers";

// The reader's latch.
//
// One shared code, handed out with the link. Subscribers live on another
// platform, so there is nothing to check a person against: what this does is
// stop a link that gets forwarded from being readable by whoever finds it.
//
// Named honestly throughout. It is not a password and it is not protection,
// and the interface says so on both sides, because a control described as
// more than it is will eventually be relied on for more than it can do.

const COOKIE_PREFIX = "emag_read_";

/** Whether this reader has already entered the code for this edition. */
export async function hasAccess(slug: string, code: string | null): Promise<boolean> {
  if (!code) return true;
  const store = await cookies();
  return store.get(COOKIE_PREFIX + slug)?.value === code;
}

/**
 * Checks a submitted code and remembers it.
 *
 * The cookie holds the code itself rather than a token. That is a deliberate
 * choice given what this is: the code is shared with every reader anyway, so
 * a cookie carrying it reveals nothing that the reader was not already
 * given, and it keeps the whole mechanism inspectable rather than looking
 * like security it is not.
 */
export async function submitCode(slug: string, expected: string, given: string) {
  "use server";

  if (given.trim() !== expected) {
    return { ok: false as const, message: "That code is not right. Check the one you were sent." };
  }

  const store = await cookies();
  store.set(COOKIE_PREFIX + slug, expected, {
    httpOnly: true,
    sameSite: "lax",
    // A reader should not have to type it again next month's worth of
    // reading later, but it should not last forever either.
    maxAge: 60 * 60 * 24 * 120,
    path: "/",
  });
  return { ok: true as const };
}

export function CodeGate({
  slug,
  publication,
  title,
  action,
}: {
  slug: string;
  publication: string;
  title: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <main className="mx mx-gate">
      <form className="mx-gate__box" action={action}>
        <span className="mx-gate__pub">{publication}</span>
        <h1 className="mx-gate__title">{title}</h1>
        <p className="mx-gate__note">
          Enter the code you were sent with this link. You will only need to do this once on
          this device.
        </p>
        <input
          className="mx-gate__input"
          name="code"
          autoComplete="off"
          autoFocus
          placeholder="Your code"
          aria-label="Your reading code"
        />
        <input type="hidden" name="slug" value={slug} />
        <button className="mx-gate__button" type="submit">
          Read this edition
        </button>
      </form>
    </main>
  );
}
