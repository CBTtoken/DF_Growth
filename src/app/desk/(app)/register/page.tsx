import Link from "next/link";
import { addAsset, deleteAsset, saveAsset } from "@/app/desk/(app)/actions";
import { listAssets } from "@/lib/desk/queries";
import type { DeskAsset } from "@/lib/desk/types";
import { Screen, card, label } from "@/components/desk/Shell";

// Every domain, subscription and account he pays for, with what it costs a
// month and when it renews. Editable in place, because the whole value is in
// it being current.
export const dynamic = "force-dynamic";

const cell =
  "rounded-lg border border-neutral-200 px-2 py-2 text-sm outline-none focus:border-neutral-900";

function rand(value: number): string {
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function daysToRenewal(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
}

const TABS = [
  { key: "business", label: "Business" },
  { key: "personal", label: "Personal" },
  { key: "all", label: "All" },
] as const;

function AssetRow({ asset }: { asset: DeskAsset }) {
  const days = daysToRenewal(asset.renewal_date);
  const soon = days !== null && days <= 30;

  return (
    <form
      action={saveAsset}
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${
        soon ? "border-amber-400 bg-amber-50" : "border-neutral-200 bg-white"
      }`}
    >
      <input type="hidden" name="id" value={asset.id} />

      <div className="flex gap-2">
        <input name="name" defaultValue={asset.name} spellCheck={false} className={`${cell} flex-1`} />
        <select name="type" defaultValue={asset.type} className={cell}>
          <option value="domain">domain</option>
          <option value="subscription">subscription</option>
          <option value="account">account</option>
          <option value="tool">tool</option>
          <option value="other">other</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          name="provider"
          defaultValue={asset.provider ?? ""}
          spellCheck={false}
          placeholder="Provider"
          className={`${cell} flex-1`}
        />
        <select name="area" defaultValue={asset.area} className={cell}>
          <option value="business">business</option>
          <option value="personal">personal</option>
        </select>
        <select name="status" defaultValue={asset.status} className={cell}>
          <option value="active">active</option>
          <option value="cancel">cancel</option>
          <option value="unknown">unknown</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          name="cost_zar_monthly"
          type="number"
          step="0.01"
          defaultValue={asset.cost_zar_monthly ?? ""}
          placeholder="R per month"
          className={`${cell} w-32`}
        />
        <select name="billing_cycle" defaultValue={asset.billing_cycle} className={cell}>
          <option value="monthly">monthly</option>
          <option value="annual">annual</option>
          <option value="once">once</option>
          <option value="unknown">unknown</option>
        </select>
        <input
          name="renewal_date"
          type="date"
          defaultValue={asset.renewal_date ?? ""}
          className={`${cell} flex-1`}
        />
      </div>

      <input
        name="where_login_lives"
        defaultValue={asset.where_login_lives ?? ""}
        spellCheck={false}
        placeholder="Where the login lives, in plain words"
        className={cell}
      />
      <input
        name="notes"
        defaultValue={asset.notes ?? ""}
        spellCheck={false}
        placeholder="Notes"
        className={cell}
      />

      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
          Save
        </button>
        {soon ? (
          <span className="text-xs font-semibold text-amber-700">
            renews in {days} {days === 1 ? "day" : "days"}
          </span>
        ) : null}
        <button formAction={deleteAsset} className="ml-auto rounded-lg px-3 py-2 text-xs text-neutral-400">
          Remove
        </button>
      </div>
    </form>
  );
}

export default async function DeskRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const { tab: tabParam, sort } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "business";

  const all = await listAssets();
  const inTab = tab === "all" ? all : all.filter((a) => a.area === tab);

  const sorted = [...inTab].sort((a, b) => {
    if (sort === "cost") return Number(b.cost_zar_monthly ?? 0) - Number(a.cost_zar_monthly ?? 0);
    if (sort === "renewal") {
      if (!a.renewal_date) return 1;
      if (!b.renewal_date) return -1;
      return a.renewal_date < b.renewal_date ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Renewals inside 30 days sit at the top wherever the sort would have put
  // them, because that is the only thing on this screen with a deadline.
  const renewingSoon = sorted.filter((a) => {
    const days = daysToRenewal(a.renewal_date);
    return days !== null && days <= 30;
  });
  const rest = sorted.filter((a) => !renewingSoon.includes(a));

  const active = inTab.filter((a) => a.status !== "cancel");
  const total = active.reduce((sum, a) => sum + Number(a.cost_zar_monthly ?? 0), 0);
  const unpriced = active.filter((a) => a.cost_zar_monthly === null).length;

  const chip = "flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-colors";

  return (
    <Screen title="Register" back={{ href: "/desk/more", label: "More" }}>
      <div className="flex gap-2 rounded-2xl bg-neutral-200/70 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/desk/register?tab=${t.key}${sort ? `&sort=${sort}` : ""}`}
            className={`${chip} ${tab === t.key ? "bg-white text-neutral-900" : "text-neutral-500"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className={card}>
        <p className="text-3xl font-semibold text-neutral-900">{rand(total)}</p>
        <p className="mt-1 text-sm text-neutral-500">
          a month, {tab === "all" ? "everything" : tab}
        </p>
        {unpriced > 0 ? (
          <p className="mt-2 text-xs text-neutral-400">
            {unpriced} {unpriced === 1 ? "record has" : "records have"} no cost captured, so this is a
            floor.
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Link
          href={`/desk/register?tab=${tab}&sort=renewal`}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            sort === "renewal" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-600"
          }`}
        >
          By renewal
        </Link>
        <Link
          href={`/desk/register?tab=${tab}&sort=cost`}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            sort === "cost" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-600"
          }`}
        >
          By cost
        </Link>
        <Link
          href={`/desk/register?tab=${tab}`}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            !sort ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-600"
          }`}
        >
          By name
        </Link>
      </div>

      {[...renewingSoon, ...rest].map((asset) => (
        <AssetRow key={asset.id} asset={asset} />
      ))}

      <form action={addAsset} className="flex flex-col gap-2 rounded-2xl border border-dashed border-neutral-300 p-4">
        <p className={label}>Add one</p>
        <input name="name" spellCheck={false} placeholder="Name" className={cell} required />
        <div className="flex gap-2">
          <select name="type" defaultValue="subscription" className={cell}>
            <option value="domain">domain</option>
            <option value="subscription">subscription</option>
            <option value="account">account</option>
            <option value="tool">tool</option>
            <option value="other">other</option>
          </select>
          <select name="area" defaultValue={tab === "personal" ? "personal" : "business"} className={cell}>
            <option value="business">business</option>
            <option value="personal">personal</option>
          </select>
          <input
            name="cost_zar_monthly"
            type="number"
            step="0.01"
            placeholder="R per month"
            className={`${cell} flex-1`}
          />
        </div>
        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
          Add
        </button>
      </form>
    </Screen>
  );
}
