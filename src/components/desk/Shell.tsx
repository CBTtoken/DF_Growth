import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// One page frame, so every screen has the same margins, the same heading
// size and the same distance from the top. Small thing, but it is most of
// what "easy to use" means on a phone: nothing moves between screens except
// the content.
export function Screen({
  title,
  subtitle,
  back,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-6 pt-6">
      {back ? (
        <Link
          href={back.href}
          className="-mb-2 flex items-center gap-1 text-sm font-medium text-neutral-500"
        >
          <ChevronLeft size={16} />
          {back.label}
        </Link>
      ) : null}

      {title ? (
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}

      {children}
    </div>
  );
}

export const card = "rounded-2xl border border-neutral-200 bg-white p-4";
export const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none transition-colors focus:border-neutral-900";
export const primaryButton =
  "rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50";
export const quietButton =
  "rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors active:bg-neutral-100";
export const label = "text-xs font-semibold uppercase tracking-wide text-neutral-400";
