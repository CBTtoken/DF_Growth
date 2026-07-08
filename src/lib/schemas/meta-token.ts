import { z } from "zod";

export const metaTokenSchema = z.object({
  accessToken: z.string().min(20, "That doesn't look like a valid access token"),
});
