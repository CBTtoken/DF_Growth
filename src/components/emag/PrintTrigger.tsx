"use client";

import { useEffect } from "react";

// Opens the browser's print dialog, where "Save as PDF" lives.
//
// The document title becomes the suggested filename in every browser, so it
// is set here rather than left as the route, which would save the file as
// something like "print".
//
// Waits for fonts before opening. A print dialog that opens while the type
// is still arriving renders the preview in a fallback face, and on some
// browsers that is what gets saved.

export function PrintTrigger({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;

    let cancelled = false;
    const open = () => {
      if (!cancelled) window.print();
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setTimeout(open, 350));
    } else {
      setTimeout(open, 900);
    }

    return () => {
      cancelled = true;
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="mx-print__note">
      <p>
        Your browser&apos;s print window should open. Choose <strong>Save as PDF</strong> as the
        destination, and set margins to none so the pages come out edge to edge.
      </p>
      <button type="button" onClick={() => window.print()}>
        Open it again
      </button>
    </div>
  );
}
