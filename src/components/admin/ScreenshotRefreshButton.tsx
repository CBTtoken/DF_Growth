"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshClientScreenshot } from "@/app/admin/clients/[id]/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ScreenshotRefreshButton({
  clientId,
  screenshotCapturedAt,
}: {
  clientId: string;
  screenshotCapturedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Marketing screenshot</h2>
        <p className="mt-1 text-sm text-gray-500">
          {screenshotCapturedAt
            ? `Last captured ${new Date(screenshotCapturedAt).toLocaleString("en-ZA")}. Used on /pricing's "See It In Action" section.`
            : "No screenshot captured yet — covered automatically once this page is among the top-visited (weekly), or refresh it now."}
        </p>
      </div>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await refreshClientScreenshot(clientId);
              if (result?.error) setError(result.error);
              else router.refresh();
            });
          }}
        >
          {isPending ? "Capturing…" : "Refresh screenshot now"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </Card>
  );
}
