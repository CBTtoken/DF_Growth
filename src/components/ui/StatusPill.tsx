import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// UI/UX Design Pass, Part 1: extracted from the repeated
// `rounded-full px-2 py-0.5 text-xs font-semibold` + semantic bg/text pair
// pattern used for every status/plan/channel badge across admin tables
// (client status, agent status, Meta connection, signup channel). Tones
// map to the exact color pairs already in use — this is extraction, not a
// new palette.
export type StatusPillTone = "neutral" | "success" | "danger" | "warning" | "brand" | "info";

const TONE_CLASSES: Record<StatusPillTone, string> = {
  neutral: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  brand: "bg-brand/10 text-brand",
  info: "bg-emerald-100 text-emerald-700",
};

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusPillTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}
