import { switchAccount } from "@/app/dashboard/switch-account-actions";

// Only renders once a login owns more than one growth_client account — the
// overwhelming majority of logins have exactly one, and this stays
// invisible for all of them. No client JS needed: each option is its own
// tiny Server Action form (switchAccount bound to that account's id),
// exactly like the rest of this dashboard's one-click actions.
export function AccountSwitcher({
  accounts,
  currentId,
}: {
  accounts: { id: string; businessName: string; slug: string }[];
  currentId: string;
}) {
  if (accounts.length < 2) return null;

  const current = accounts.find((a) => a.id === currentId);
  const others = accounts.filter((a) => a.id !== currentId);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-4 pr-1.5 text-xs">
      <span className="text-gray-400">
        Managing <span className="font-semibold text-ink">{current?.businessName ?? "this page"}</span>
      </span>
      {others.map((account) => (
        <form key={account.id} action={switchAccount.bind(null, account.id)}>
          <button
            type="submit"
            className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600 transition hover:bg-brand/10 hover:text-brand"
          >
            Switch to {account.businessName}
          </button>
        </form>
      ))}
    </div>
  );
}
