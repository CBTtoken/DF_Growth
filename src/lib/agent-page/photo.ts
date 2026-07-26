import { createAdminClient } from "@/lib/supabase/admin";

// Agent Programme Phase 1. Shared by the admin form (Sec 1.10) and by the
// agent's own upload link (Sec 1.5, "a direct link to upload"), so both
// paths validate identically and neither can leave an orphaned file.

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function replaceAgentPhoto(
  agentId: string,
  file: unknown
): Promise<{ error: string } | { path: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!file.type.startsWith("image/")) return { error: "That file is not an image." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "That photo is over 5MB. Use a smaller one." };

  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("photo_path").eq("id", agentId).maybeSingle();

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  // Timestamped rather than a fixed name per agent: the bucket is public,
  // so a replacement written to the same path would keep serving the old
  // image from cache, including inside every WhatsApp preview already
  // shared of that page.
  const path = `${agentId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("agent-photos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Failed to upload agent photo", uploadError);
    return { error: "Could not upload that photo. Please try again." };
  }

  await admin.from("agents").update({ photo_path: path }).eq("id", agentId);

  // Only after the new one is safely stored and pointed at, so a failure
  // anywhere above leaves the existing photo untouched rather than the
  // page falling back to a monogram it was never meant to show.
  if (agent?.photo_path) {
    await admin.storage.from("agent-photos").remove([agent.photo_path]);
  }

  return { path };
}

export async function clearAgentPhoto(agentId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("photo_path").eq("id", agentId).maybeSingle();
  if (!agent?.photo_path) return;

  await admin.from("agents").update({ photo_path: null }).eq("id", agentId);
  await admin.storage.from("agent-photos").remove([agent.photo_path]);
}
