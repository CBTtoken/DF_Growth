"use client";

import { useState } from "react";
import { Check, Copy, Facebook, MessageCircle } from "lucide-react";

// Handoff section 4: "Share to WhatsApp and Facebook, one tap, no account."
// And section 5: "Sharing stays anonymous. Never gate a share."
//
// The two share buttons are plain anchors to wa.me and Facebook's own sharer
// URL. No SDK, no Meta pixel, no login, and they work with JavaScript
// switched off, which matters because a share is the one action this page
// most needs to survive a bad connection. Only the copy button needs the
// clipboard API, and it is the least important of the three.
export function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <MessageCircle size={15} />
        Share on WhatsApp
      </a>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0f65d6]"
      >
        <Facebook size={15} />
        Share on Facebook
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard access can be refused, and there is nothing useful
            // to say about it. The two share buttons still work.
          }
        }}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-border bg-white px-4 py-2.5 text-sm font-semibold text-neutral-mid transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
      >
        {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
