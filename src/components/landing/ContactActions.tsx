"use client";

import { Phone, MessageCircle } from "lucide-react";
import { readableTextOn } from "@/lib/color";

// Handoff 02 A: the three actions that replace the contact gate.
//
// Contact details used to be hidden until a visitor submitted the lead form,
// so the page could count leads. That taxed conversion hardest where the money
// is: a customer with a burst pipe at eleven at night does not fill in a form
// to reveal a phone number, they go back and phone the next business. Details
// are public now and the tap is what gets counted.
//
// WhatsApp is primary and visually dominant, Call is secondary but present,
// and the form stays further down the page as the third option for non-urgent
// enquiries and after hours.
//
// A client component only because of the tracking ping. The links themselves
// are plain anchors and work with JavaScript disabled or the ping blocked,
// which matters: the tap must always reach the phone.
export function ContactActions({
  growthClientId,
  whatsAppHref,
  telHref,
  displayNumber,
  accentColor,
  variant,
}: {
  growthClientId: string;
  // Null when the member has no usable number of that kind. Handoff 02 B:
  // "Never render a dead button."
  whatsAppHref: string | null;
  telHref: string | null;
  displayNumber: string | null;
  accentColor: string;
  // "hero" sits on the member's brand colour above the fold, "section" sits on
  // a light surface at the foot of the page. Same actions, same order, so a
  // visitor who scrolls past the first one meets the identical thing again.
  variant: "hero" | "section";
}) {
  if (!whatsAppHref && !telHref) return null;

  const track = (action: "call" | "whatsapp") => {
    // keepalive so the request survives the browser navigating away to the
    // dialer or to WhatsApp, which happens immediately on a phone. Failure is
    // ignored on purpose: a tracking write must never interfere with the tap.
    try {
      const device = window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop";
      void fetch("/api/lead-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ growthClientId, action, device }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Nothing to do. The link still works.
    }
  };

  const onHero = variant === "hero";
  const whatsAppText = readableTextOn(WHATSAPP_GREEN);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {whatsAppHref && (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("whatsapp")}
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: WHATSAPP_GREEN, color: whatsAppText }}
          >
            <MessageCircle size={18} aria-hidden />
            WhatsApp us
          </a>
        )}

        {telHref && (
          <a
            href={telHref}
            onClick={() => track("call")}
            className={`inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-base font-semibold transition hover:-translate-y-0.5 ${
              onHero ? "" : "bg-white"
            }`}
            style={
              onHero
                ? { borderColor: `${accentColor}59`, color: accentColor }
                : { borderColor: `${accentColor}59`, color: accentColor }
            }
          >
            <Phone size={18} aria-hidden />
            Call us
          </a>
        )}
      </div>

      {/* Handoff 02 A: "Also render the phone number as selectable text next to
          the buttons. On desktop a tel: link often does nothing useful, and a
          visitor needs to be able to read and copy the number." Shown even when
          the member has hidden the call button, because hiding a button is not
          the same as hiding a number, and a visitor who wants to dial by hand
          should still be able to. */}
      {displayNumber && (
        <p className={`text-sm ${onHero ? "opacity-80" : "text-gray-500"}`}>
          <span className="select-all font-medium">{displayNumber}</span>
        </p>
      )}
    </div>
  );
}

// WhatsApp's own brand green. Not the member's colour: this button is
// recognised by its colour before it is read, and repainting it in whatever
// the member picked costs that recognition for no gain.
const WHATSAPP_GREEN = "#25D366";
