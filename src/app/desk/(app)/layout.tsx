import Link from "next/link";
import { requireDeskUser } from "@/lib/desk/auth";

// Everything inside this group is behind the session gate. The login screen
// sits outside it, which is why the gate can live in a layout rather than
// being repeated on every page.
//
// The nav carries no counts, no badges and no unread markers anywhere. That
// is a hard rule from the brief, not an oversight: the operator's stated
// pain is unread indicators.
const TABS = [
  { href: "/desk", label: "Dump" },
  { href: "/desk/today", label: "Today" },
  { href: "/desk/waiting", label: "Waiting" },
  { href: "/desk/register", label: "Register" },
  { href: "/desk/export", label: "Export" },
];

export default async function DeskAppLayout({ children }: { children: React.ReactNode }) {
  await requireDeskUser();

  return (
    <>
      <main className="flex-1 pb-24">{children}</main>

      {/* Fixed to the bottom of the screen, where a thumb is. */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white">
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className="block px-1 py-4 text-center text-xs font-semibold text-neutral-600 active:bg-neutral-100"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
