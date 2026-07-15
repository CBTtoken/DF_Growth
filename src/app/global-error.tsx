"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Consolidated Sprint Sec 3.3: catches errors that escape the root layout
// itself (rare, but exactly the class of error a page-level error.tsx
// can't catch) and reports them to Sentry before showing a bare fallback.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-8 text-center">
          <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
          <p className="text-sm text-gray-500">Please refresh the page — if this keeps happening, let us know.</p>
        </main>
      </body>
    </html>
  );
}
