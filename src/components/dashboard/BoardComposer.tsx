"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { publishBoardPost } from "@/app/dashboard/board/actions";
import { POST_KINDS } from "@/lib/board/kinds";
import { CITIES, OTHER_CITY } from "@/lib/cities";

// The composer. One screen, one form, already open.
//
// The whole argument for the board is that posting has to be no harder than
// posting in a Facebook group, so the form starts with a kind already
// selected and only the title is required. Nothing here asks a member to
// choose a template, pick a category or fill in anything the platform
// already knows.
const inputClass =
  "rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

export function BoardComposer({ needsCity }: { needsCity: boolean }) {
  const [state, formAction, pending] = useActionState(publishBoardPost, null);
  const [kind, setKind] = useState(POST_KINDS[0].id);
  const [city, setCity] = useState("");

  const selected = POST_KINDS.find((k) => k.id === kind) ?? POST_KINDS[0];

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-ink">Post to the board</h2>
        <p className="mt-1 text-sm text-gray-500">
          It goes public straight away, on its own page that Google can read, and on your area page.
        </p>
      </div>

      {/* Kind, as one tap on an already-open form rather than a screen the
          member has to get past first. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {POST_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                kind === k.id ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{selected.hint}</p>
        <input type="hidden" name="kind" value={kind} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board-title" className="text-sm font-semibold text-gray-700">
          What is it
        </label>
        <input
          id="board-title"
          type="text"
          name="title"
          required
          maxLength={90}
          placeholder="Geyser replacement, same day"
          className={inputClass}
        />
        {state?.error?.title && <p className="text-xs text-red-600">{state.error.title[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="board-body" className="text-sm font-semibold text-gray-700">
          Tell them more <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="board-body"
          name="body"
          rows={4}
          maxLength={1500}
          placeholder="What is included, how long it takes, what area you cover."
          className={inputClass}
        />
        {state?.error?.body && <p className="text-xs text-red-600">{state.error.body[0]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="board-price" className="text-sm font-semibold text-gray-700">
            Price <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input id="board-price" type="text" name="price" placeholder="1200" className={inputClass} />
          <p className="text-xs text-gray-500">Leave it out if it depends on the job.</p>
          {state?.error?.price && <p className="text-xs text-red-600">{state.error.price[0]}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="board-photo" className="text-sm font-semibold text-gray-700">
            Photo <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="board-photo"
            type="file"
            name="photo"
            accept="image/*"
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gray-700"
          />
          <p className="text-xs text-gray-500">A real photo of the work gets far more taps than none.</p>
        </div>
      </div>

      {/* Asked once, only of a member who has no town saved. Without it the
          post cannot appear on any area page, which is most of its reach. */}
      {needsCity && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label htmlFor="board-city" className="text-sm font-semibold text-gray-700">
            Which town or city do you work in
          </label>
          <p className="text-xs text-gray-600">
            We do not have this yet, and the board groups businesses by area. Asked once, then saved to your account.
          </p>
          <select
            id="board-city"
            name="city"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={inputClass}
          >
            <option value="">Choose your town or city</option>
            {CITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {city === OTHER_CITY && (
            <input type="text" name="cityOther" required placeholder="Type your town" className={inputClass} />
          )}
          {state?.error?.city && <p className="text-xs text-red-600">{state.error.city[0]}</p>}
        </div>
      )}

      {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}
      {state?.success && (
        <p className="text-sm text-green-700">
          Posted.{" "}
          <Link href="/board" className="font-semibold underline underline-offset-2">
            See it on the board
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Posting..." : "Post it"}
      </button>
    </form>
  );
}
