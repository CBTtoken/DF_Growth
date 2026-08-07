"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { WINDOW_HOURS } from "@/lib/wa-inbox/window";

// The 24-hour window countdown (handoff section 5). Green while there is
// comfortable time, amber for the last four hours, and an unmistakable
// "Window closed" once a plain reply would no longer deliver. Ticks every
// thirty seconds; the server actions re-check the real times, so this is
// display, not enforcement.
export function WindowPill({ lastInboundAt }: { lastInboundAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!lastInboundAt) return <StatusPill tone="neutral">No messages yet</StatusPill>;

  const closesAt = new Date(lastInboundAt).getTime() + WINDOW_HOURS * 60 * 60 * 1000;
  const msLeft = closesAt - now;

  if (msLeft <= 0) return <StatusPill tone="danger">Window closed</StatusPill>;

  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  const label = hours >= 1 ? `${hours}h ${minutes}m left` : `${minutes}m left`;

  return <StatusPill tone={msLeft < 4 * 60 * 60 * 1000 ? "warning" : "success"}>{label}</StatusPill>;
}
