"use client";

import { trackAgentWhatsAppClick } from "@/components/agent-page/AgentPageTracking";

// Agent Programme Phase 1. The "Start free" call to action stays a plain
// anchor in the server components (nothing about it needs the client);
// only WhatsApp needs to be here, because Sec 1.9's custom event needs a
// click handler.
//
// Kept as an anchor rather than a button that navigates, so a visitor can
// still long-press or middle-click it, and so the link keeps working with
// JavaScript disabled, where the event simply does not fire.
export function WhatsAppButton({
  whatsappUrl,
  slug,
  className,
  children = "WhatsApp me",
}: {
  whatsappUrl: string;
  slug: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackAgentWhatsAppClick(slug)}
      className={className}
    >
      {children}
    </a>
  );
}
