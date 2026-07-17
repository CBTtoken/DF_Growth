"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { adminUploadLogo, adminUploadPhoto, adminDeletePhoto } from "@/app/admin/clients/[id]/actions";

const sectionClass = "flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
const saveBtnClass =
  "mt-1 inline-flex w-fit items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50";

// Closes the gap flagged after the first admin-builder pass — logo and
// photos are the one part of "build this client's page" that couldn't
// reuse a simple form-field action, since Storage upload needs real
// multipart handling. Mirrors uploadClientPhoto/deleteClientPhoto
// (dashboard/actions.ts) and saveStep3's logo branch (onboard/actions.ts)
// exactly, just admin-gated with an explicit clientId instead of session
// resolution — see adminUploadLogo/adminUploadPhoto's own comments.
export function AdminMediaSection({
  clientId,
  logoUrl,
  photosStorageBase,
  photos,
}: {
  clientId: string;
  logoUrl: string | null;
  photosStorageBase: string;
  photos: { id: string; storage_path: string }[];
}) {
  const [logoState, logoAction, logoPending] = useActionState(adminUploadLogo, null);
  const [photoState, photoAction, photoPending] = useActionState(adminUploadPhoto, null);
  const [isDeleting, startDeleting] = useTransition();
  const router = useRouter();

  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-bold tracking-tight text-ink">Logo &amp; Photos</h2>

      <div className="flex flex-col gap-3 border-b border-gray-100 pb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Logo</h3>
        {logoUrl && (
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            <Image src={logoUrl} alt="Current logo" width={64} height={64} className="max-h-16 max-w-16 object-contain" unoptimized />
          </div>
        )}
        <form action={logoAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="file" name="logo" accept="image/*" required className="text-sm text-gray-600" />
          <button type="submit" disabled={logoPending} className={saveBtnClass}>
            {logoPending ? "Uploading..." : "Upload Logo"}
          </button>
        </form>
        {logoState?.error && <p className="text-xs text-red-600">{logoState.error}</p>}
        {logoState?.success && <p className="text-xs text-green-700">Saved.</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Photos ({photos.length}/10)</h3>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                <Image
                  src={`${photosStorageBase}/${p.storage_path}`}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() =>
                    startDeleting(async () => {
                      await adminDeletePhoto(clientId, p.id);
                      router.refresh();
                    })
                  }
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <form action={photoAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="file" name="photo" accept="image/*" multiple className="text-sm text-gray-600" />
          <button type="submit" disabled={photoPending} className={saveBtnClass}>
            {photoPending ? "Uploading..." : "Upload Photos"}
          </button>
        </form>
        {photoState?.error && <p className="text-xs text-red-600">{photoState.error}</p>}
        {photoState?.success && <p className="text-xs text-green-700">Saved.</p>}
      </div>
    </section>
  );
}
