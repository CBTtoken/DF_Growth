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
  addAction,
}: {
  customers: PickerCustomer[];
  selectedId: string | null;
  name?: string;
  label?: string;
  /**
   * Creates a customer from whatever name has been typed, without leaving
   * the screen. Passed in from the server component that owns the form.
   *
   * Dewald, 30 July: "they should have an option from there to Add
   * customer, most people and systems do that and are used to that flow,
   * one screen that can have multiple action points." The live drafts
   * agreed with him: ten of eleven unfinished quotes had no customer on
   * them, and the only way to add one was a trip to a separate page.
   *
   * Optional, so the invoice screen and anywhere else using this picker are
   * unchanged until they want it.
   */
  addAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [chosen, setChosen] = useState<string>(selectedId ?? "");
  // A member with nobody saved has nothing to choose from, so the search
  // box is open from the start rather than hidden behind a tap. Seven of
  // the eleven stuck drafts on 30 July had no customer and no line items,
  // which is a screen that did not invite anyone to start.
  const nothingSaved = customers.length === 0;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(nothingSaved && !selectedId);
  // Only steal focus when the member actually asked for the search. Opening
  // focused on page load pops the keyboard and scrolls the screen out from
  // under someone who was reading it.
  const [askedFor, setAskedFor] = useState(false);

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
            {/* Dewald, 30 July: "Not chosen yet" describes a state. This
                tells them what to do about it, which is the difference
                between a label and an instruction. */}
            {chosenCustomer?.name ?? "Select or Type"}
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setAskedFor(true);
            }}
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            {chosenCustomer ? "Change" : nothingSaved ? "Add a customer" : "Select Customer"}
          </button>
        </div>
      ) : (
        <>
          <input
            autoFocus={askedFor}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={nothingSaved ? "Type your customer's name" : "Start typing a name"}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Search your customers"
          />

          {/* The fast path: whatever they have typed becomes a customer on
              this quote, here, with no second screen. Shown as soon as
              there is no exact match, so it is available while they are
              still typing rather than only after the list empties.

              A formAction on this button submits the surrounding form to a
              different Server Action, which is why no nested form is
              needed. The hidden input carries the typed name, because it
              otherwise lives only in React state. */}
          {addAction && q.length > 1 && !customers.some((c) => c.name.toLowerCase() === q) && (
            <>
              <input type="hidden" name="newCustomerName" value={query.trim()} />
              <button
                type="submit"
                formAction={addAction}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-bold text-white transition hover:bg-brand-dark"
              >
                <span aria-hidden className="text-lg leading-none">+</span>
                Add &ldquo;{query.trim()}&rdquo; as the customer
              </button>
            </>
          )}

          {shown.length === 0 ? (
            <p className="text-sm font-normal text-gray-500">
              {q.length > 1
                ? "No saved customer matches that, so use the button above."
                : nothingSaved
                  ? "Type their name above and press the button that appears. That is all a quote needs."
                  : "Start typing to search, or to add someone new."}
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
