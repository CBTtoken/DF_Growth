import { dismissSpotlightBanner } from "@/app/dashboard/page-poster-actions";

// Handoff Sec 6, "not optional and it is half the value of the build": a
// spotlight the member never sees is a post to a small page audience, a
// spotlight they share is the whole point. Same visual language as
// PageChecklist (amber, one line, plain words), placed above
// the fold so it isn't missed — the one thing on this screen that expects
// same-day action.
export function SpotlightBanner({
  queueId,
  postLabel,
  postLink,
}: {
  queueId: string;
  postLabel: "welcome post" | "spotlight";
  postLink: string | null;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-ink">Your {postLabel} is live on Facebook</h2>
        <p className="mt-0.5 text-xs text-gray-600">
          Share it from your own page, that reaches far more people than ours alone.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {postLink && (
          <a
            href={postLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            View and share
          </a>
        )}
        <form action={dismissSpotlightBanner.bind(null, queueId)}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-amber-400"
          >
            Dismiss
          </button>
        </form>
      </div>
    </section>
  );
}
