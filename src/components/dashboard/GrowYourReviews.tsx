"use client";

import { useState } from "react";
import { sendGrowReviewRequest } from "@/app/dashboard/review-request-actions";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
//
// The manual route. Once Job 1's linking is in place, a Growth member who
// also uses KatisoBiz gets this triggered automatically the moment an
// invoice is paid (see review-actions.ts) — this block is what's left for
// everyone else, and it stays even after that ships, because a Growth
// member with no KatisoBiz activity has no completion event to trigger
// from at all.
export function GrowYourReviews({
  customers,
}: {
  /** Only populated when this member also has a linked KatisoBiz account —
   *  picking a past customer beats retyping a number already on file. */
  customers: { id: string; name: string; whatsapp: string | null; phone: string | null }[];
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  function pickCustomer(id: string) {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    setName(customer.name);
    setNumber(customer.whatsapp ?? customer.phone ?? "");
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Grow your reviews</h2>
        <p className="mt-1 text-sm text-gray-500">
          Name a happy customer, we write the message, you press send from your own WhatsApp.
        </p>
      </div>

      <form action={sendGrowReviewRequest} className="flex flex-col gap-3">
        {customers.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Choose a past customer, or type someone new below</span>
            <select
              onChange={(e) => pickCustomer(e.target.value)}
              defaultValue=""
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Type a name and number instead</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="customerName"
            required
            placeholder="Customer's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <input
            type="tel"
            name="customerNumber"
            required
            placeholder="WhatsApp number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !number.trim()}
          className="self-start rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          Ask for a review
        </button>
      </form>
    </section>
  );
}
