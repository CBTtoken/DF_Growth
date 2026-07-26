import { switchDashboardRole } from "@/app/dashboard/role-actions";
import type { DashboardRole } from "@/lib/agents/dashboard-role";

// Agent Programme Phase 1 Sec 1.1: only rendered when the login actually
// holds both roles. An agent with no business membership never sees this,
// and neither does a business owner who is not an agent, which is almost
// everybody.
//
// A server component with two small forms rather than a client component:
// nothing here needs state, and the switch has to set a cookie, which only
// a Server Action can do.
export function RoleSwitcher({ active }: { active: DashboardRole }) {
  const base =
    "rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:cursor-default";
  const on = "bg-brand text-white shadow-sm";
  const off = "text-gray-500 hover:text-gray-800";

  return (
    <div className="flex items-center gap-1 self-start rounded-full bg-gray-100 p-1">
      <form action={switchDashboardRole.bind(null, "business" as DashboardRole)}>
        <button type="submit" disabled={active === "business"} className={`${base} ${active === "business" ? on : off}`}>
          My business
        </button>
      </form>
      <form action={switchDashboardRole.bind(null, "agent" as DashboardRole)}>
        <button type="submit" disabled={active === "agent"} className={`${base} ${active === "agent" ? on : off}`}>
          My agent page
        </button>
      </form>
    </div>
  );
}
