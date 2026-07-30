import { NextResponse } from "next/server";
import { readIdentityToken, rememberVisitor } from "@/lib/board/visitor";

// The link in a reply email.
//
// This is what replaces the code. Somebody messages a business, the business
// answers, and the answer arrives in their inbox with this link on it.
// Clicking it recognises them and opens the conversation, which means the
// address is proved by being used rather than by anybody being sent away to
// fetch a number.
//
// A route rather than a page, because it has to set the cookie before
// anything renders, and a page cannot.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const identityId = readIdentityToken(token);

  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za");
  url.pathname = "/board/messages";

  // A bad or tampered token lands on the messages page signed out, which
  // explains itself, rather than on an error.
  if (!identityId) return NextResponse.redirect(url);

  await rememberVisitor(identityId);
  return NextResponse.redirect(url);
}
