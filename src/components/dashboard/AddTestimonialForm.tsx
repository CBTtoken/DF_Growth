"use client";

import { useActionState } from "react";
import { addTestimonial } from "@/app/dashboard/actions";

export function AddTestimonialForm() {
  const [state, formAction, pending] = useActionState(addTestimonial, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold">Add a testimonial</h3>

      <input
        type="text"
        name="authorName"
        placeholder="Customer name"
        required
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {state?.error?.authorName && <p className="text-xs text-red-600">{state.error.authorName[0]}</p>}

      <textarea
        name="quote"
        placeholder="What did they say?"
        required
        rows={3}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {state?.error?.quote && <p className="text-xs text-red-600">{state.error.quote[0]}</p>}

      <select name="rating" className="rounded border border-gray-300 px-3 py-2 text-sm" defaultValue="">
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
        className="rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Add testimonial"}
      </button>
    </form>
  );
}
