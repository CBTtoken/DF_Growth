import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// UI/UX Design Pass, Part 1: extracted from the identical
// `rounded-2xl border border-gray-100 bg-white p-6 shadow-sm` markup
// repeated ~20+ times across admin pages and dashboard sections — this is
// the de-facto shell that already existed, just never pulled into one
// component. `warning` matches DangerZone's own pre-existing
// `border-red-100 bg-red-50/50` treatment verbatim (not a new look), it's
// just now reusable for any other destructive-action card. `elevated`
// exists for cards that should read as the primary focus of a page (e.g.
// a queue that needs a decision) without inventing a new color language.
export type CardVariant = "default" | "elevated" | "warning";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "border-gray-100 bg-white",
  elevated: "border-brand/20 bg-brand/5",
  warning: "border-red-100 bg-red-50/50",
};

export function Card({
  variant = "default",
  className,
  children,
}: {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border p-6 shadow-sm", VARIANT_CLASSES[variant], className)}>
      {children}
    </section>
  );
}
