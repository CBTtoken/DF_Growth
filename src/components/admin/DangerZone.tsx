"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleClientVisibility, deleteClient } from "@/app/admin/clients/[id]/actions";

export function DangerZone({ clientId, isActive }: { clientId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Danger zone</h2>
        <p className="mt-1 text-sm text-gray-500">
          {isActive
            ? "This page is currently live and publicly visible."
            : "This page is currently hidden — it returns a 404 and won't appear in the Marketplace."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await toggleClientVisibility(clientId);
              router.refresh();
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-400 disabled:opacity-50"
        >
          {isActive ? "Make page inactive" : "Reactivate page"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (
              !window.confirm(
                "This permanently deletes this account and everything attached to it — leads, photos, testimonials, orders. This cannot be undone. Continue?"
              )
            ) {
              return;
            }
            startTransition(async () => {
              await deleteClient(clientId);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-50"
        >
          Delete permanently
        </button>
      </div>
    </section>
  );
}
