import { z } from "zod";

// Combined spec Sec 25. before-after only actually uses beforeImageUrl/
// afterImageUrl (both required for that type); the other three content
// types only use headline/subtext/imageUrl — validated together in one
// schema since the form itself is one form with fields that show/hide by
// content type, simpler than three near-identical schemas.
export const socialAssetSchema = z.object({
  contentType: z.enum(["special-offer", "announcement", "before-after", "new-arrival"]),
  // Combined spec Sec 25 item 3: no per-asset style choice here — the
  // generator uses the account's current default style (AssetStyleSection,
  // repositioned above this section), the exact same source testimonials'
  // own auto-generation already reads from. One style setting, not two.
  headline: z.string().min(1, "This can't be blank").max(120),
  subtext: z.string().max(160).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  beforeImageUrl: z.string().url().optional().or(z.literal("")),
  afterImageUrl: z.string().url().optional().or(z.literal("")),
});
