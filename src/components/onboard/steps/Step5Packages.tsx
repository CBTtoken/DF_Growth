"use client";

import { useActionState, useEffect } from "react";
import { saveStep5, type OnboardState } from "@/app/onboard/actions";

type PackageInitial = { name: string; price: string; description: string };
type FieldErrors = (Record<string, string[]> & { _form?: string[] }) | undefined;

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
    <fieldset className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Package {index}
      </legend>

      <input
        type="text"
        name={`package${index}Name`}
        defaultValue={initial.name}
        placeholder="Name, e.g. Standard Wash"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {errors?.[`package${index}Name`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Name`][0]}</p>
      )}

      <input
        type="text"
        name={`package${index}Price`}
        defaultValue={initial.price}
        placeholder="Price, e.g. R350/month or From R200"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {errors?.[`package${index}Price`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Price`][0]}</p>
      )}

      <textarea
        name={`package${index}Description`}
        defaultValue={initial.description}
        placeholder="What's included, in a sentence or two"
        rows={2}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {errors?.[`package${index}Description`] && (
        <p className="text-xs text-red-600">{errors[`package${index}Description`][0]}</p>
      )}
    </fieldset>
  );
}

export function Step5Packages({
  initialPackages,
  onSuccess,
}: {
  initialPackages: PackageInitial[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep5, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  const slots: PackageInitial[] = [0, 1, 2].map(
    (i) => initialPackages[i] ?? { name: "", price: "", description: "" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Your packages or pricing</h2>
        <p className="text-sm text-gray-500">
          Optional — skip this if you don&apos;t have set packages or pricing tiers, just leave
          everything blank and continue.
        </p>
      </div>

      <PackageFields index={1} initial={slots[0]} errors={state?.error} />
      <PackageFields index={2} initial={slots[1]} errors={state?.error} />
      <PackageFields index={3} initial={slots[2]} errors={state?.error} />

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
