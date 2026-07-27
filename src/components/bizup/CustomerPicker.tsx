"use client";

import { useState } from "react";

// The customer dropdown had the same problem as the price list chips: fine
// at five customers, unusable at a hundred, and a plain <select> on a phone
// is a scroll wheel with no search at all.
//
// Renders a hidden input so the surrounding <form> and its Server Action
// are unchanged, and so a member who never touches the search still submits
// whatever was already chosen.

export interface PickerCustomer {
  id: string;
  name: string;
}

const MAX_SHOWN = 8;

export function CustomerPicker({
  customers,
  selectedId,
  name = "customerId",
  label = "Who is this for?",
}: {
  customers: PickerCustomer[];
  selectedId: string | null;
  name?: string;
  label?: string;
}) {
  const [chosen, setChosen] = useState<string>(selectedId ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const chosenCustomer = customers.find((c) => c.id === chosen) ?? null;

  const q = query.trim().toLowerCase();
  const matches = q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers;
  const shown = matches.slice(0, MAX_SHOWN);

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      <span>{label}</span>
      <input type="hidden" name={name} value={chosen} />

      {/* Closed state: what is currently chosen, and a way to change it.
          A member who picked the right customer first time never sees the
          search at all. */}
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-xl border border-gray-200 bg-white px-4 py-3 text-base ${
              chosenCustomer ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {chosenCustomer?.name ?? "Not chosen yet"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {chosenCustomer ? "Change" : "Choose someone"}
          </button>
        </div>
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing a name"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Search your customers"
          />

          {shown.length === 0 ? (
            <p className="text-sm font-normal text-gray-500">
              No customer matches that. Add them as a new customer below.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {shown.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setChosen(c.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left text-base transition ${
                    c.id === chosen
                      ? "border-brand bg-brand/5 font-semibold text-ink"
                      : "border-gray-200 bg-white text-gray-900 hover:border-brand"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {matches.length > shown.length && (
            <p className="text-xs font-normal text-gray-500">
              Showing {shown.length} of {matches.length}. Keep typing to narrow it down.
            </p>
          )}
        </>
      )}
    </div>
  );
}
