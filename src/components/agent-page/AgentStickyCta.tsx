"use client";

import { useEffect, useState } from "react";
import { ContactButton } from "@/components/agent-page/AgentCtas";
import { SAND } from "@/lib/agent-page/themes";
import type { AgentContact } from "@/lib/agent-page/identity";

// The Bolt design's mobile sticky bar: hidden at the top of the page, where
// the hero's own buttons are still on screen, and sliding up once the
// visitor has scrolled past them. Translating rather than mounting keeps it
// smooth and keeps the buttons in the DOM for assistive tech throughout.
const SHOW_AFTER_PX = 520;

export function AgentStickyCta({
  contact,
  slug,
  pricesUrl,
  accent600,
}: {
  contact: AgentContact;
  slug: string;
  pricesUrl: string;
  accent600: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-300 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div
        className="mx-3 mb-3 flex gap-2 rounded-2xl border bg-white/95 p-2.5 shadow-[0_2px_4px_rgba(26,23,20,0.06),0_18px_40px_rgba(26,23,20,0.12)] backdrop-blur"
        style={{ borderColor: SAND[200] }}
      >
        {contact && (
          <ContactButton
            contact={contact}
            slug={slug}
            label={contact.kind === "whatsapp" ? "WhatsApp" : "Email"}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
            style={{ backgroundColor: accent600 }}
          />
        )}
        <a
          href={pricesUrl}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
          style={{ borderColor: SAND[300], color: "#1a1714" }}
        >
          See prices
        </a>
      </div>
    </div>
  );
}
