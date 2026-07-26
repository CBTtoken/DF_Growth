"use client";

import { MessageCircle, ArrowRight, Mail } from "lucide-react";
import { trackAgentContactClick } from "@/components/agent-page/AgentPageTracking";
import type { AgentContact } from "@/lib/agent-page/identity";

// One primary action, resolved to whichever contact route the agent
// actually has, and never a signup button in its place.
//
// A client component only because build spec 1.9 wants a custom pixel event
// on the contact click. Kept as an anchor rather than a button that
// navigates, so a visitor can still long-press or middle-click it, and so
// it keeps working with JavaScript disabled, where the event simply does
// not fire.
export function ContactButton({
  contact,
  slug,
  label,
  className,
  style,
}: {
  contact: NonNullable<AgentContact>;
  slug: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = contact.kind === "whatsapp" ? MessageCircle : Mail;

  return (
    <a
      href={contact.href}
      // A mailto must not open a blank tab it can never fill.
      target={contact.kind === "whatsapp" ? "_blank" : undefined}
      rel={contact.kind === "whatsapp" ? "noreferrer" : undefined}
      onClick={() => trackAgentContactClick(slug, contact.kind)}
      className={`group ${className ?? ""}`}
      style={style}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span>{label ?? contact.label}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </a>
  );
}
