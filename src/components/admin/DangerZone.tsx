"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleClientVisibility, deleteClient } from "@/app/admin/clients/[id]/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function DangerZone({ clientId, isActive }: { clientId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card variant="warning" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Danger zone</h2>
        <p className="mt-1 text-sm text-gray-500">
          {isActive
            ? "This page is currently live and publicly visible."
            : "This page is currently hidden — it returns a 404 and won't appear in the Marketplace."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          lift
          disabled={isPending}
          className="bg-white"
          onClick={() =>
            startTransition(async () => {
              await toggleClientVisibility(clientId);
              router.refresh();
            })
          }
        >
          {isActive ? "Make page inactive" : "Reactivate page"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          lift
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
        >
          Delete permanently
        </Button>
      </div>
    </Card>
  );
}
