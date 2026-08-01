"use server";

import { redirect } from "next/navigation";
import { getEdition } from "@/lib/moxie/editions";
import { redeemAccessCode } from "@/lib/moxie/entitlement";
import { moxiePath } from "@/lib/moxie/host";

export async function submitAccessCode(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const code = String(formData.get("code") ?? "");

  const edition = await getEdition(slug);
  if (!edition) redirect(await moxiePath("/editions"));

  const result = await redeemAccessCode(edition.id, slug, code);
  if (!result.ok) {
    redirect(await moxiePath(`/editions/${slug}?code=invalid`));
  }

  redirect(await moxiePath(`/read/${slug}`));
}
