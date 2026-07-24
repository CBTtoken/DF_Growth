import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// clsx + tailwind-merge are already dependencies (clsx used across the
// template hero components, tailwind-merge unused until now) — this is
// the standard combinator so a passed-in className can override a
// primitive's own default classes instead of just concatenating (e.g. a
// caller's own `p-4` should win over Card's default `p-6`, not conflict).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
