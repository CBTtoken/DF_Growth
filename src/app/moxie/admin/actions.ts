"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateCodeBatch, requirePublisher } from "@/lib/moxie/admin";
import { moxiePath, MOXIE_PREFIX } from "@/lib/moxie/host";

export async function createCodeBatch(formData: FormData) {
  // Checked in the action and not only on the screen. A server action is a
  // public endpoint, and hiding a button says nothing at all about what can
  // be posted to it.
  const publisher = await requirePublisher();
  if (!publisher) redirect(await moxiePath("/login?next=/admin"));

  const editionId = String(formData.get("editionId") ?? "");
  const count = Number(formData.get("count") ?? 0);
  const label = String(formData.get("label") ?? "").trim();

  if (!editionId || !Number.isFinite(count) || count < 1) {
    redirect(await moxiePath("/admin?error=input"));
  }

  const { created } = await generateCodeBatch(editionId, Math.floor(count), label);
  revalidatePath(`${MOXIE_PREFIX}/admin`);
  redirect(await moxiePath(`/admin?created=${created}`));
}
