"use client";

import { useActionState } from "react";
import { addTestimonial } from "@/app/dashboard/actions";

export function AddTestimonialForm() {
  const [state, formAction, pending] = useActionState(addTestimonial, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-700">Add a testimonial</h3>

      <input
        type="text"
        name="authorName"
        placeholder="Customer name"
        required
        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {state?.error?.authorName && <p className="text-xs text-red-600">{state.error.authorName[0]}</p>}

      <textarea
        name="quote"
        placeholder="What did they say?"
        required
        rows={3}
        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {state?.error?.quote && <p className="text-xs text-red-600">{state.error.quote[0]}</p>}

      <select
        name="rating"
        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        defaultValue=""
      >
        <option value="">No rating</option>
        <option value="5">★★★★★</option>
        <option value="4">★★★★</option>
        <option value="3">★★★</option>
        <option value="2">★★</option>
        <option value="1">★</option>
      </select>

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.success && <p className="text-xs text-green-600">Added — social image generated below.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Add testimonial"}
      </button>
    </form>
  );
}
