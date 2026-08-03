import Link from "next/link";
import {
  CalendarClock,
  HeartHandshake,
  Activity,
  LineChart,
  ListTree,
  LogOut,
  PackageOpen,
  Receipt,
} from "lucide-react";
import { AddToPhone } from "@/components/desk/AddToPhone";
import { Screen, card } from "@/components/desk/Shell";

// Everything with a monthly reason to be opened, rather than a daily one.
export const dynamic = "force-dynamic";

const LINKS = [
  {
    href: "/desk/sprints",
    icon: PackageOpen,
    title: "Sprints",
    blurb: "Bundle work up and hand it to CC with a brief",
  },
  {
    href: "/desk/health",
    icon: Activity,
    title: "Health",
    blurb: "Spend, space and anything that changed without you",
  },
  {
    href: "/desk/horizon",
    icon: CalendarClock,
    title: "Next 30 days",
    blurb: "Deadlines and renewals, in date order",
  },
  {
    href: "/desk/tracking",
    icon: LineChart,
    title: "Business tracking",
    blurb: "Where everything stands, as text, to paste into a chat",
  },
  {
    href: "/desk/register",
    icon: Receipt,
    title: "Register",
    blurb: "Every domain, subscription and account you pay for",
  },
  {
    href: "/desk/go-away",
    icon: HeartHandshake,
    title: "If I go away",
    blurb: "What your family would need to know",
  },
  {
    href: "/desk/all",
    icon: ListTree,
    title: "Everything",
    blurb: "The full list, filtered, for editing",
  },
];

export default function DeskMorePage() {
  return (
    <Screen title="More">
      <AddToPhone />

      <div className="flex flex-col gap-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`${card} flex items-center gap-3`}>
              <Icon size={18} className="shrink-0 text-neutral-500" />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-neutral-900">{link.title}</span>
                <span className="text-xs text-neutral-500">{link.blurb}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <form action="/desk/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold text-neutral-500"
        >
          <LogOut size={18} className="text-neutral-400" />
          Sign out
        </button>
      </form>
    </Screen>
  );
}
