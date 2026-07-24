import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// UI/UX Design Pass, Part 1: extracted from the identical table markup
// repeated in admin/page.tsx, admin/agents/page.tsx, admin/reactivation/page.tsx
// (`overflow-x-auto` wrapper, header row `border-b border-gray-100 text-xs
// uppercase tracking-wide text-gray-400`, body rows `border-b border-gray-50`,
// cells `py-2.5 pr-4`). `minWidthClassName` preserves each table's own
// existing min-width (they differ per column count: `min-w-[640px]` vs
// `min-w-[720px]`) rather than forcing one width on all of them.
export function Table({ minWidthClassName, children }: { minWidthClassName?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-left text-sm", minWidthClassName)}>{children}</table>
    </div>
  );
}

export function TableHeadRow({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">{children}</tr>
    </thead>
  );
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("py-2 pr-4", className)} {...props}>
      {children}
    </th>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-b border-gray-50">{children}</tr>;
}

export function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("py-2.5 pr-4", className)} {...props}>
      {children}
    </td>
  );
}
