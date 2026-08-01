"use client";

import { useState } from "react";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white"
      >
        {copied ? "Copied" : "Copy everything"}
      </button>

      {/* Selectable as well as copyable, for the case where the clipboard
          permission is refused or the browser is fussy. */}
      <pre className="max-h-[60vh] overflow-auto rounded-2xl border border-neutral-200 bg-white p-4 text-xs leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}
