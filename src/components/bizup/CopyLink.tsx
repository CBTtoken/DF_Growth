"use client";

import { useState } from "react";

// A link a member has to hand to someone else, so the one thing it must do
// well is get onto the clipboard. Shown in full as well, because a member
// on a phone with a flaky clipboard permission still needs to be able to
// read it out or long-press it.
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard permission denied, which happens on some mobile
              // browsers. The field above still holds the link, so this is
              // not worth an error message.
            }
          }}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          {copied ? "Copied" : "Copy the link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Here are my accounting records: ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
        >
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
