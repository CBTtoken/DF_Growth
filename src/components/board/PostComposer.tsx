"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ImagePlus } from "lucide-react";
import type { PostKindMeta } from "@/lib/board/kinds";
import { CITIES, OTHER_CITY } from "@/lib/cities";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// One composer, used by a business and by a person, on the board and in the
// dashboard.
//
// Two screens. Pick what you are posting, then fill in only the fields that
// kind actually needs. Nobody is shown a price box for a post that has no
// price, and nobody has to work out what "Update" was supposed to mean.
//
// The heading and the box are always first, because that is the shape
// everybody already knows from Facebook. Photo and town sit under them. That
// is the whole form.

const inputClass =
  "w-full rounded-xl border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export type ComposerState =
  | { error?: string; success?: boolean; slug?: string }
  | null;

export function PostComposer({
  kinds,
  action,
  /** Set for a signed-in member, so we can offer to post as the business. */
  businessName,
  /** Set when the account already has a town, so nobody is asked twice. */
  savedCity,
  /** A person has to say who they are. A signed-in business does not. */
  needsIdentity,
  backHref = "/board",
}: {
  kinds: PostKindMeta[];
  action: (state: ComposerState, formData: FormData) => Promise<ComposerState>;
  businessName?: string | null;
  savedCity?: string | null;
  needsIdentity: boolean;
  backHref?: string;
}) {
  const [chosen, setChosen] = useState<PostKindMeta | null>(kinds.length === 1 ? kinds[0] : null);
  const [city, setCity] = useState("");
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">Posted. It is on the board now.</p>
        <div className="flex flex-wrap gap-2">
          {state.slug && (
            <Link
              href={`/board/post/${state.slug}`}
              className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-brand-blue-dark"
            >
              See it
            </Link>
          )}
          <Link
            href={backHref}
            className="rounded-full border border-neutral-border bg-white px-4 py-2 text-xs font-semibold text-neutral-mid"
          >
            Back to the board
          </Link>
        </div>
      </div>
    );
  }

  // Screen one. What are you posting.
  if (!chosen) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-neutral-ink">What do you want to post?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {kinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => setChosen(kind)}
              className="flex flex-col items-start gap-0.5 rounded-2xl border border-neutral-border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-card"
            >
              <span className="text-sm font-bold text-neutral-ink">{kind.pickerLabel}</span>
              <span className="text-xs text-neutral-muted">{kind.pickerHint}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Screen two. Only what this kind needs.
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {kinds.length > 1 && (
        <button
          type="button"
          onClick={() => setChosen(null)}
          className="inline-flex items-center gap-1 self-start text-xs font-semibold text-neutral-muted hover:text-brand-blue"
        >
          <ChevronLeft size={13} /> {chosen.pickerLabel}, change
        </button>
      )}

      <input type="hidden" name="kind" value={chosen.id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="post-title" className="text-sm font-semibold text-neutral-ink">
          {chosen.titleLabel}
        </label>
        <input
          id="post-title"
          type="text"
          name="title"
          required
          maxLength={90}
          placeholder={chosen.titlePlaceholder}
          className={inputClass}
        />
      </div>

      <textarea name="body" rows={4} maxLength={1500} placeholder={chosen.bodyPlaceholder} className={inputClass} />

      {chosen.showPrice && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="post-price" className="text-sm font-semibold text-neutral-ink">
            Price <span className="font-normal text-neutral-muted">(optional)</span>
          </label>
          <input id="post-price" type="text" name="price" placeholder="1200" className={inputClass} />
          <p className="text-xs text-neutral-muted">Leave it out if it depends on the job.</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="post-photo"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-ink"
        >
          <ImagePlus size={15} /> Photo <span className="font-normal text-neutral-muted">(optional)</span>
        </label>
        <input
          id="post-photo"
          type="file"
          name="photo"
          accept="image/*"
          className="w-full rounded-xl border border-neutral-border bg-white px-3.5 py-2 text-sm text-neutral-ink file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-mid"
        />
      </div>

      {/* Town, always, because the area page is where a post gets found. */}
      {savedCity ? (
        <p className="text-xs text-neutral-muted">Posting in {savedCity}.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="post-city" className="text-sm font-semibold text-neutral-ink">
            Which town
          </label>
          <select
            id="post-city"
            name="city"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={inputClass}
          >
            <option value="">Choose your town</option>
            {CITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {city === OTHER_CITY && (
            <input type="text" name="cityOther" required placeholder="Type your town" className={inputClass} />
          )}
        </div>
      )}

      {/* A person says who they are. A signed-in business already has. */}
      {needsIdentity && (
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-border bg-neutral-light p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
            <input type="email" name="email" required placeholder="Your email" className={inputClass} />
          </div>
          <p className="text-xs text-neutral-muted">
            Your name shows on the post. Your email never does, and is only used so people can reach you and so we can
            stop anyone abusing the board.
          </p>
          <TurnstileWidget />
        </div>
      )}

      {/* A member selling his own fridge is not his company selling a
          fridge, which was Dewald's own point. */}
      {businessName && !chosen.businessByDefault && (
        <p className="text-xs text-neutral-muted">Posting as yourself, not as {businessName}.</p>
      )}
      {businessName && chosen.businessByDefault && (
        <label className="flex items-start gap-2 text-xs text-neutral-mid">
          <input type="checkbox" name="asMyself" className="mt-0.5" />
          <span>This is private, post it as me and not as {businessName}.</span>
        </label>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Posting..." : "Post it"}
      </button>
    </form>
  );
}
