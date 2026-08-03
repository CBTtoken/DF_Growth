"use client";

import { useMemo, useState } from "react";

/**
 * The package builder's live panel (handoff 7.2): one screen, live
 * arithmetic, nothing saved until save is pressed. All figures recompute
 * on every keystroke from data the server loaded once; the server action
 * recomputes nothing because no derived number is stored, only the
 * package's own facts.
 */
export type BuilderBenefit = {
  id: string;
  name: string;
  benefitType: string;
  costModel: string;
  rateCents: number | null;
  revSharePercent: number | null;
  redemptionRate: number;
  redemptionSource: "observed" | "assumed" | "none";
  defaultFaceCents: number;
};

export type BuilderInitial = {
  lineageId: string | null;
  version: number;
  name: string;
  brand: string;
  monthlyPriceRand: number;
  selected: Record<string, number>; // benefitId -> face value cents
  referralRands: { l1: number; l2: number; l3: number };
};

function rand(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export function PackageBuilder({
  catalogue,
  initial,
  saveAction,
}: {
  catalogue: BuilderBenefit[];
  initial: BuilderInitial;
  saveAction: (formData: FormData) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand);
  const [priceRand, setPriceRand] = useState(String(initial.monthlyPriceRand));
  const [selected, setSelected] = useState<Record<string, number>>(initial.selected);
  const [refs, setRefs] = useState(initial.referralRands);

  const priceCents = Math.round((Number(priceRand.replace(",", ".")) || 0) * 100);
  const referralCents = Math.round((refs.l1 + refs.l2 + refs.l3) * 100);

  const panel = useMemo(() => {
    const chosen = catalogue.filter((b) => selected[b.id] !== undefined);
    let fixed = 0;
    let variable = 0;
    let face = 0;
    const warnings: string[] = [];

    for (const b of chosen) {
      face += selected[b.id] ?? 0;
      if (b.costModel === "per_active_member_per_month") fixed += b.rateCents ?? 0;
      else if (b.costModel === "per_redemption") variable += Math.round((b.rateCents ?? 0) * b.redemptionRate);
      else if (b.costModel === "revenue_share_percent")
        variable += Math.round((priceCents * (b.revSharePercent ?? 0)) / 100);
    }

    const totalCost = fixed + variable + referralCents;
    const margin = priceCents - totalCost;

    if (margin < 0) warnings.push("Negative margin: this package loses money on a fully referred member.");
    const headline = [...chosen].sort((a, b) => (selected[b.id] ?? 0) - (selected[a.id] ?? 0))[0];
    if (
      headline &&
      face > 0 &&
      (selected[headline.id] ?? 0) >= face / 2 &&
      (headline.costModel === "zero_cost" || headline.costModel === "no_rate")
    ) {
      warnings.push(
        `HARD WARNING: the headline value claim leans on "${headline.name}", which is ${
          headline.costModel === "zero_cost" ? "a partner's own marketing spend and can be withdrawn" : "unrated"
        }.`
      );
    }
    for (const b of chosen) {
      if (b.costModel === "per_redemption" && b.redemptionSource === "none") {
        warnings.push(`"${b.name}" has no observed or assumed redemption rate; its variable cost reads zero.`);
      }
    }

    return { fixed, variable, totalCost, margin, face, warnings };
  }, [catalogue, selected, priceCents, referralCents]);

  const toggle = (b: BuilderBenefit) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[b.id] !== undefined) delete next[b.id];
      else next[b.id] = b.defaultFaceCents;
      return next;
    });
  };

  const sourceLabel = { observed: "observed from the ledger", assumed: "manual assumption", none: "no data" };

  return (
    <form action={saveAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="lineage" value={initial.lineageId ?? ""} />
      <input type="hidden" name="version" value={initial.version} />
      <input type="hidden" name="payload" value={JSON.stringify({ selected })} />
      <input type="hidden" name="brand" value={brand} />

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold uppercase tracking-wide text-svc-ink/70" htmlFor="pb-name">
              Package name
            </label>
            <input
              id="pb-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-2 w-full border-2 border-svc-ink/20 bg-white px-4 py-3 text-base focus:border-svc-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide text-svc-ink/70" htmlFor="pb-price">
              Monthly price (Rand)
            </label>
            <input
              id="pb-price"
              name="price"
              value={priceRand}
              onChange={(e) => setPriceRand(e.target.value)}
              inputMode="decimal"
              required
              className="mt-2 w-full border-2 border-svc-ink/20 bg-white px-4 py-3 text-base focus:border-svc-green focus:outline-none"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold uppercase tracking-wide text-svc-ink/70">Brand</span>
          <div className="mt-2 flex gap-2">
            {(["svc", "moxie"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`min-h-11 border-2 px-4 text-sm font-semibold ${
                  brand === b ? "border-svc-green bg-svc-green text-white" : "border-svc-ink/20 text-svc-ink"
                }`}
              >
                {b === "svc" ? "Smart Value Club" : "Moxie"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-svc-heading text-lg font-bold">Benefits from the catalogue</h2>
          <div className="mt-3 space-y-2">
            {catalogue.map((b) => {
              const on = selected[b.id] !== undefined;
              return (
                <div key={b.id} className={`border-2 p-4 ${on ? "border-svc-green bg-white/70" : "border-svc-ink/15 bg-white/40"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={on} onChange={() => toggle(b)} className="mt-1 h-5 w-5 accent-svc-green" />
                      <span>
                        <span className="font-svc-heading text-base font-bold">{b.name}</span>
                        <span className="block text-xs text-svc-ink/60">
                          {b.costModel === "no_rate"
                            ? "No rate on record"
                            : b.costModel === "per_active_member_per_month"
                              ? `${rand(b.rateCents ?? 0)} per member per month`
                              : b.costModel === "per_redemption"
                                ? `${rand(b.rateCents ?? 0)} per redemption at ${(b.redemptionRate * 100).toFixed(0)}% (${sourceLabel[b.redemptionSource]})`
                                : b.costModel === "revenue_share_percent"
                                  ? `${b.revSharePercent ?? 0}% revenue share`
                                  : "Zero cost (partner's own spend)"}
                        </span>
                      </span>
                    </label>
                    {on && (
                      <label className="text-right text-xs text-svc-ink/60">
                        Face value R
                        <input
                          value={(selected[b.id] ?? 0) / 100}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [b.id]: Math.round((Number(e.target.value.replace(",", ".")) || 0) * 100),
                            }))
                          }
                          inputMode="decimal"
                          className="mt-1 block w-24 border-2 border-svc-ink/20 bg-white px-2 py-1 text-right text-sm focus:border-svc-green focus:outline-none"
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-svc-heading text-lg font-bold">Referral rates for this package</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {([
              ["l1", "Level 1"],
              ["l2", "Level 2"],
              ["l3", "Level 3"],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-xs font-semibold uppercase tracking-wide text-svc-ink/60">
                {label} (R/month)
                <input
                  name={`ref_${key}`}
                  value={refs[key]}
                  onChange={(e) => setRefs((p) => ({ ...p, [key]: Number(e.target.value.replace(",", ".")) || 0 }))}
                  inputMode="decimal"
                  className="mt-1 block w-full border-2 border-svc-ink/20 bg-white px-3 py-2 text-base font-normal normal-case focus:border-svc-green focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* The live panel. */}
      <aside className="h-fit border-4 border-svc-green bg-white/70 p-5 lg:sticky lg:top-20">
        <h2 className="font-svc-heading text-lg font-bold">Per member per month</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Fixed cost</dt><dd className="font-semibold">{rand(panel.fixed)}</dd></div>
          <div className="flex justify-between"><dt>Variable cost</dt><dd className="font-semibold">{rand(panel.variable)}</dd></div>
          <div className="flex justify-between"><dt>Referral exposure (full depth)</dt><dd className="font-semibold">{rand(referralCents)}</dd></div>
          <div className="flex justify-between border-t-2 border-svc-ink/10 pt-1"><dt>Total cost</dt><dd className="font-semibold">{rand(panel.totalCost)}</dd></div>
          <div className="flex justify-between"><dt>Price</dt><dd className="font-semibold">{rand(priceCents)}</dd></div>
          <div className="flex justify-between border-t-2 border-svc-ink/10 pt-1">
            <dt className="font-bold">Gross margin</dt>
            <dd className={`font-bold ${panel.margin < 0 ? "text-svc-amber" : "text-svc-green"}`}>
              {rand(panel.margin)} ({priceCents > 0 ? ((panel.margin / priceCents) * 100).toFixed(1) : "0"}%)
            </dd>
          </div>
          <div className="flex justify-between pt-2"><dt>Total face value (public claim)</dt><dd className="font-svc-heading font-bold text-svc-blue">{rand(panel.face)}</dd></div>
        </dl>

        {panel.warnings.length > 0 && (
          <ul className="mt-4 space-y-2 border-t-2 border-svc-ink/10 pt-3 text-xs leading-relaxed">
            {panel.warnings.map((w) => (
              <li key={w} className="border-l-4 border-svc-amber pl-2 font-semibold">{w}</li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-6 text-base font-semibold text-white hover:bg-svc-ink"
        >
          Save as version {initial.version}
        </button>
        <p className="mt-2 text-xs text-svc-ink/60">
          Saving creates a new version. Existing members stay on their current
          version until moved.
        </p>
      </aside>
    </form>
  );
}
