"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { applyReportRules } from "@/lib/board/moderation";
import { recalcDocumentTotals, computeLineTotal } from "@/lib/bizup/documents";
import { isVatVendor } from "@/lib/bizup/vat";
import { katisoPath } from "@/lib/bizup/product";
import { truncateOnWord } from "@/lib/text";

// The member's side of Phase 2: what the business can do about a comment on
// its own post.
//
// Two things, and they are the two things section 5 asks for by name. Get a
// bad comment out of public view quickly, and turn a good one into a quote
// in one action.

type CommentActionState = { error?: string; success?: string } | null;

/** The comment, only if it is on a post belonging to the given business. */
async function ownedComment(commentId: string, clientId?: string) {
  const resolvedId = clientId ?? (await requireGrowthClientId()).id;
  if (!resolvedId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_comments")
    .select("id, body, status, post_id, identity_id, board_posts!inner(id, slug, title, price_cents, growth_client_id)")
    .eq("id", commentId)
    .maybeSingle();

  if (!data) return null;
  const post = (data as unknown as {
    board_posts: { id: string; slug: string; title: string; price_cents: number | null; growth_client_id: string };
  }).board_posts;

  if (post.growth_client_id !== resolvedId) return null;
  return { clientId: resolvedId, comment: data, post, admin };
}

/**
 * The business reporting a comment on its own post.
 *
 * Section 5: "A member must be able to report a comment on his own post and
 * get it out of public view quickly. That is the call Dewald will otherwise
 * receive personally." So this is one action with an immediate effect: the
 * report is logged, the countable rule for an owner report fires, and the
 * comment is out of sight before the member has put the phone down.
 *
 * It is held, not deleted. A business does not get to quietly erase a fair
 * complaint, and a person still reviews it.
 */
export async function memberReportComment(commentId: string): Promise<void> {
  const owned = await ownedComment(commentId);
  if (!owned) return;

  await owned.admin.from("board_reports").insert({
    target_type: "comment",
    target_id: commentId,
    reported_by_client_id: owned.clientId,
    reason: "Reported by the business whose post it is",
  });

  await applyReportRules(commentId);

  revalidatePath("/dashboard/board");
  revalidatePath(`/board/post/${owned.post.slug}`);
}

/**
 * Turns a comment into a KatisoBiz quote, prefilled, in one tap.
 *
 * The handoff calls this the feature no competitor can build, and the reason
 * it works is that both halves are already ours: the board knows who asked
 * and what they asked about, and KatisoBiz knows how to price and send it.
 *
 * Two things it deliberately does not do. It does not invent a price: the
 * post's price becomes the line's price when there is one, and zero when
 * there is not, because a quote the member has not looked at is not a quote.
 * And it only carries the commenter's email across when they ticked the box
 * saying the business may quote them. Without that tick the customer is
 * created with a name only, and the member sends it however he likes.
 */
export async function buildQuoteFromComment(
  commentId: string,
  clientId?: string
): Promise<{ error: string } | { quotePath: string }> {
  const owned = await ownedComment(commentId, clientId);
  if (!owned) return { error: "That comment is no longer available." };

  const { admin, clientId: businessId, post, comment } = owned;

  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, template_id, vat_number")
    .eq("growth_client_id", businessId)
    .maybeSingle();

  // The common case today rather than an edge case: no KatisoBiz account is
  // linked to any Growth client yet, so this message is the one most members
  // will see first and it has to say what to do about it.
  if (!account) {
    return {
      error:
        "Quoting from a comment needs your KatisoBiz account linked to this business. Open KatisoBiz from your dashboard and sign in with this same email, then try again.",
    };
  }

  const { data: identity } = await admin
    .from("board_identities")
    .select("display_name, email, quote_consent")
    .eq("id", comment.identity_id)
    .single();

  const { data: draft, error: draftError } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "quote",
      series: "QUO",
      status: "draft",
      template_id: account.template_id,
      vat_rate: isVatVendor(account.vat_number) ? 0.15 : 0,
      // What the quote is for, in the member's own history, so a draft
      // opened three days later still explains itself.
      job_reference: truncateOnWord(`From a board comment: ${post.title}`, 80),
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    console.error("Failed to create a quote from a board comment", draftError);
    return { error: "Could not start the quote, please try again." };
  }

  if (identity) {
    const { data: existingCustomer } = await admin
      .from("bizup_customers")
      .select("id")
      .eq("account_id", account.id)
      .ilike("name", identity.display_name)
      .maybeSingle();

    let customerId = existingCustomer?.id ?? null;
    if (!customerId) {
      const { data: created } = await admin
        .from("bizup_customers")
        .insert({
          account_id: account.id,
          name: identity.display_name,
          email: identity.quote_consent ? identity.email : null,
          notes: identity.quote_consent
            ? "Added from a comment on The Board. They agreed to be emailed a quote."
            : "Added from a comment on The Board. They did not agree to be emailed, so no address is stored.",
        })
        .select("id")
        .single();
      customerId = created?.id ?? null;
    }

    if (customerId) {
      await admin.from("bizup_documents").update({ customer_id: customerId }).eq("id", draft.id);
    }
  }

  const unitPrice = post.price_cents ?? 0;
  await admin.from("bizup_document_lines").insert({
    document_id: draft.id,
    line_no: 1,
    description: post.title,
    quantity: 1,
    unit: "each",
    unit_price_excl_cents: unitPrice,
    line_total_excl_cents: computeLineTotal(1, unitPrice),
  });

  await recalcDocumentTotals(draft.id, isVatVendor(account.vat_number));

  return { quotePath: await katisoPath(`/quotes/${draft.id}`) };
}

/**
 * The form action. Deliberately a thin wrapper: it resolves who is asking
 * and where to send them, and the work itself lives in the function above
 * so it can be exercised without a browser session.
 */
export async function createQuoteFromComment(
  commentId: string,
  _prevState: CommentActionState,
  _formData: FormData
): Promise<CommentActionState> {
  const result = await buildQuoteFromComment(commentId);
  if ("error" in result) return { error: result.error };
  redirect(result.quotePath);
}
