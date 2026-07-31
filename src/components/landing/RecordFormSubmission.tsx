"use client";

import { useEffect, useRef } from "react";

// Handoff 02 C: records the form submission as a lead event, so all three
// actions land in one table and the member's dashboard compares like with
// like.
//
// Rendered only inside the lead form's success state, which React mounts once
// when the submission comes back. The ref guards against a second fire if that
// subtree ever re-renders, on top of the 10 second dedupe the database already
// applies. Renders nothing.
export function RecordFormSubmission({ growthClientId }: { growthClientId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const device = window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop";
    void fetch("/api/lead-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ growthClientId, action: "form", device }),
      keepalive: true,
    }).catch(() => {});
  }, [growthClientId]);

  return null;
}
