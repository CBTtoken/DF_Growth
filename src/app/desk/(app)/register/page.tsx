import Link from "next/link";
import { addAsset, deleteAsset, saveAsset } from "@/app/desk/(app)/actions";
import { listAssets } from "@/lib/desk/queries";
import type { DeskAsset } from "@/lib/desk/types";

// Screen 4. Every domain, subscription and account he pays for, with what it
// costs a month and when it renews. Editable in place, because the whole
// value is in it being current.
export const dynamic = "force-dynamic";

const cell = "rounded-lg border border-neutral-200 px-2 py-2 text-sm outline-none focus:border-neutral-900";

function rand(value: number): string {
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function daysToRenewal(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
}

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
        <button
          formAction={deleteAsset}
          className="ml-auto rounded-lg px-3 py-2 text-xs text-neutral-400"
        >
          Remove
        </button>
      </div>
    </form>
  );
}

export default async function DeskRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; sort?: string }>;
}) {
  const { area, sort } = await searchParams;
  const all = await listAssets();

  const filtered = area === "personal" || area === "business" ? all.filter((a) => a.area === area) : all;

  const sorted = [...filtered].sort((a, b) => {
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

  const active = all.filter((a) => a.status !== "cancel");
  const sum = (rows: DeskAsset[]) =>
    rows.reduce((total, a) => total + Number(a.cost_zar_monthly ?? 0), 0);
  const business = sum(active.filter((a) => a.area === "business"));
  const personal = sum(active.filter((a) => a.area === "personal"));
  const unpriced = active.filter((a) => a.cost_zar_monthly === null).length;

  const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";
  const on = "border-neutral-900 bg-neutral-900 text-white";
  const off = "border-neutral-300 bg-white text-neutral-600";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-2xl font-semibold">{rand(business + personal)} a month</p>
        <p className="mt-1 text-sm text-neutral-500">
          {rand(business)} business, {rand(personal)} personal
        </p>
        {unpriced > 0 ? (
          <p className="mt-2 text-xs text-neutral-400">
            {unpriced} records have no cost captured, so this is a floor.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/desk/register" className={`${chip} ${!area ? on : off}`}>
          All
        </Link>
        <Link href="/desk/register?area=business" className={`${chip} ${area === "business" ? on : off}`}>
          Business
        </Link>
        <Link href="/desk/register?area=personal" className={`${chip} ${area === "personal" ? on : off}`}>
          Personal
        </Link>
        <Link
          href={`/desk/register?${area ? `area=${area}&` : ""}sort=renewal`}
          className={`${chip} ${sort === "renewal" ? on : off}`}
        >
          By renewal
        </Link>
        <Link
          href={`/desk/register?${area ? `area=${area}&` : ""}sort=cost`}
          className={`${chip} ${sort === "cost" ? on : off}`}
        >
          By cost
        </Link>
      </div>

      {[...renewingSoon, ...rest].map((asset) => (
        <AssetRow key={asset.id} asset={asset} />
      ))}

      <form action={addAsset} className="flex flex-col gap-2 rounded-2xl border border-dashed border-neutral-300 p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Add one</p>
        <input name="name" spellCheck={false} placeholder="Name" className={cell} required />
        <div className="flex gap-2">
          <select name="type" defaultValue="subscription" className={cell}>
            <option value="domain">domain</option>
            <option value="subscription">subscription</option>
            <option value="account">account</option>
            <option value="tool">tool</option>
            <option value="other">other</option>
          </select>
          <select name="area" defaultValue="business" className={cell}>
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
    </div>
  );
}
