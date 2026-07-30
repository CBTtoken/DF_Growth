import { z } from "zod";
import { POST_KINDS } from "@/lib/board/kinds";

// Validation for the member's board composer.
//
// Short on purpose. Every required field is a reason not to post, and the
// whole argument for the board is that posting has to be as easy as posting
// in a Facebook group. Title and kind are the only things a member must
// give, and kind arrives pre-selected.
export const boardPostSchema = z.object({
  kind: z.enum(POST_KINDS.map((k) => k.id) as [string, ...string[]]),
  title: z
    .string()
    .trim()
    .min(4, "Give it a short title so people know what it is")
    .max(90, "Keep the title under 90 characters, the rest belongs in the description"),
  body: z.string().trim().max(1500, "That is longer than anyone will read, keep it under 1500 characters").optional(),
  // Free text, because a member types "1 200" or "R1200,50" and both are
  // correct. parseAmountToCents in lib/bizup/money.ts already handles every
  // shape KatisoBiz sees, so the price field on the board behaves the same
  // way as the price field on a quote.
  price: z.string().trim().optional(),
  // Only asked for, and only required, when the member has no city saved
  // yet. Area is the member's city (lib/board/areas.ts), so a post with no
  // area cannot appear on any area page, and that is worth one question.
  city: z.string().trim().optional(),
  cityOther: z.string().trim().optional(),
});
