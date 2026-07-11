"use client";

import { useActionState, useEffect } from "react";
import { saveStep6, type OnboardState } from "@/app/onboard/actions";

type PackageInitial = { name: string; price: string; description: string };
type FieldErrors = (Record<string, string[]> & { _form?: string[] }) | undefined;

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

function PackageFields({
  index,
  initial,
  errors,
}: {
  index: 1 | 2 | 3;
  initial: PackageInitial;
  errors: FieldErrors;
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand">
        Package {index}
      </legend>

      <input
        type="text"
        name={`package${index}Name`}
        defaultValue={initial.name}
        placeholder="Name, e.g. Standard Wash"
        className={inputClass}
      />
      {errors?.[`package${index}Name`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Name`][0]}</p>
      )}

      <input
        type="text"
        name={`package${index}Price`}
        defaultValue={initial.price}
        placeholder="Price, e.g. R350/month or From R200"
        className={inputClass}
      />
      {errors?.[`package${index}Price`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Price`][0]}</p>
      )}

      <textarea
        name={`package${index}Description`}
        defaultValue={initial.description}
        placeholder="What's included, in a sentence or two"
        rows={2}
        className={inputClass}
      />
      {errors?.[`package${index}Description`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Description`][0]}</p>
      )}
    </fieldset>
  );
}

export function Step6Packages({
  initialPackages,
  onSuccess,
  submitLabel = "Continue",
}: {
  initialPackages: PackageInitial[];
  onSuccess: () => void;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep6, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  const slots: PackageInitial[] = [0, 1, 2].map(
    (i) => initialPackages[i] ?? { name: "", price: "", description: "" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Your packages or pricing</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
          Optional — skip if you don&apos;t have set packages
        </span>
      </div>

      <PackageFields index={1} initial={slots[0]} errors={state?.error} />
      <PackageFields index={2} initial={slots[1]} errors={state?.error} />
      <PackageFields index={3} initial={slots[2]} errors={state?.error} />

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
