import { cookies } from "next/headers";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Who the person on the board is, without ever sending them off the screen.
//
// This replaces the emailed-code flow, which Dewald hit in testing and
// correctly called a wall. The evidence it fails was already on this
// platform: the review system asks for a password before somebody may
// praise a plumber, and has zero reviews after six weeks live.
//
// So an identity is now a name, optionally an email, and a signed cookie.
// Supabase Auth is not involved on the public side at all, which also
// removes the broken template problem underneath the old flow: Supabase
// sends a sign-in link rather than a code to anybody who already has an
// account, and every KatisoBiz member already has one.
//
// The email is verified by being used. A business replies, that reply lands
// in the inbox carrying a link back into the conversation, and a made-up
// address simply never hears anything. That is a self-enforcing check with
// no door to stand at.

const COOKIE = "df_board_visitor";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function secret(): string {
  // The same application key the rest of the platform signs and encrypts
  // with. Absent in a misconfigured environment, and failing loudly beats
  // signing everything with an empty string.
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY is not set");
  return key;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

/** `<id>.<signature>`. Tamper with the id and the signature stops matching. */
export function identityToken(identityId: string): string {
  return `${identityId}.${sign(identityId)}`;
}

export function readIdentityToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature) return null;

  const expected = sign(id);
  // Constant time, because this is the only thing standing between a
  // guessed uuid and somebody else's conversations.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return id;
}

export type Visitor = {
  id: string;
  displayName: string;
  email: string | null;
  quoteConsent: boolean;
};

/** The person on this device, or null. Null is the normal case, never an error. */
export async function currentVisitor(): Promise<Visitor | null> {
  const store = await cookies();
  const id = readIdentityToken(store.get(COOKIE)?.value);
  if (!id) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_identities")
    .select("id, display_name, email, quote_consent, blocked_at")
    .eq("id", id)
    .maybeSingle();

  // A blocked person is treated exactly like a stranger rather than being
  // told they are blocked. Telling them is how they learn to make a second
  // identity.
  if (!data || data.blocked_at) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email,
    quoteConsent: data.quote_consent,
  };
}

/** Puts the signed identity on this device. Called from server actions only. */
export async function rememberVisitor(identityId: string) {
  const store = await cookies();
  store.set(COOKIE, identityToken(identityId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Finds or creates the identity behind a name and an optional email, and
 * remembers it on this device.
 *
 * Keyed on the email when there is one, so somebody who comments from their
 * phone and then messages from their laptop is one person with one thread
 * rather than two. With no email there is nothing to key on, so each device
 * gets its own identity, which is the correct behaviour for somebody who
 * gave us nothing to recognise them by.
 */
export async function resolveVisitor(input: {
  displayName: string;
  email?: string | null;
  quoteConsent?: boolean;
}): Promise<{ visitor: Visitor } | { error: string }> {
  const admin = createAdminClient();
  const displayName = input.displayName.trim();
  const email = input.email?.trim().toLowerCase() || null;

  const existingVisitor = await currentVisitor();

  if (email) {
    const { data: byEmail } = await admin
      .from("board_identities")
      .select("id, display_name, email, quote_consent, blocked_at")
      .eq("email", email)
      .maybeSingle();

    if (byEmail?.blocked_at) {
      // Same message a genuine failure would give. Never "you are blocked".
      return { error: "Could not post that, please try again later." };
    }

    if (byEmail) {
      await admin
        .from("board_identities")
        .update({
          display_name: displayName,
          quote_consent: input.quoteConsent ?? byEmail.quote_consent,
        })
        .eq("id", byEmail.id);
      await rememberVisitor(byEmail.id);
      return {
        visitor: {
          id: byEmail.id,
          displayName,
          email: byEmail.email,
          quoteConsent: input.quoteConsent ?? byEmail.quote_consent,
        },
      };
    }
  }

  // Already known on this device and adding an address for the first time.
  if (existingVisitor) {
    await admin
      .from("board_identities")
      .update({
        display_name: displayName,
        email: email ?? existingVisitor.email,
        quote_consent: input.quoteConsent ?? existingVisitor.quoteConsent,
      })
      .eq("id", existingVisitor.id);

    return {
      visitor: {
        ...existingVisitor,
        displayName,
        email: email ?? existingVisitor.email,
        quoteConsent: input.quoteConsent ?? existingVisitor.quoteConsent,
      },
    };
  }

  const { data: created, error } = await admin
    .from("board_identities")
    .insert({ display_name: displayName, email, quote_consent: input.quoteConsent ?? false })
    .select("id, display_name, email, quote_consent")
    .single();

  if (error || !created) {
    console.error("Could not create a board identity", error);
    return { error: "Something went wrong, please try again." };
  }

  await rememberVisitor(created.id);
  return {
    visitor: {
      id: created.id,
      displayName: created.display_name,
      email: created.email,
      quoteConsent: created.quote_consent,
    },
  };
}
