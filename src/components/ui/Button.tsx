import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/cn";

// UI/UX Design Pass, Part 1: extracted from the near-verbatim button class
// strings repeated across every admin page and dashboard section (e.g.
// `rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white
// transition hover:bg-brand-dark` appears almost unchanged in admin/page.tsx,
// admin/agents/page.tsx, admin/clients/[id]/page.tsx, AccountSection.tsx,
// ReviewsManagement.tsx, and more). `size` values map to the exact pixel
// dimensions already in use, not new ones — "sm" for inline row actions
// (agents approve/reject), "md" for page-header nav buttons, "lg" for
// DangerZone-style standalone actions.
//
// Three separate exports rather than one polymorphic component with an
// `href` prop: call sites already know statically whether they need a real
// <button> (form submit / onClick), an internal <Link>, or a plain <a>
// (external URLs / non-page routes like /api/admin/export, which the
// codebase already special-cases with its own eslint-disable comment since
// Link's client-side routing doesn't apply there) — a discriminated union
// trying to cover all three just fights TypeScript for no real benefit.
export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-gray-200 text-gray-700 hover:border-gray-300",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-4 py-2 text-xs",
  lg: "px-5 py-2.5 text-sm",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50";

function buttonClasses(variant: ButtonVariant, size: ButtonSize, lift: boolean, className?: string) {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], lift && "hover:-translate-y-0.5", className);
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; lift?: boolean };

export function Button({
  variant = "primary",
  size = "md",
  lift = false,
  className,
  ...props
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClasses(variant, size, lift, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  lift = false,
  className,
  ...props
}: StyleProps & LinkProps & { className?: string; children?: ReactNode }) {
  return <Link className={buttonClasses(variant, size, lift, className)} {...props} />;
}

// For external URLs / non-page routes only — see the comment above.
export function ExternalLinkButton({
  variant = "primary",
  size = "md",
  lift = false,
  className,
  ...props
}: StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses(variant, size, lift, className)} {...props} />;
}
