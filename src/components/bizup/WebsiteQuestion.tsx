import { answerWebsiteQuestion, dismissWebsiteQuestion } from "@/app/bizup/nudge-actions";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 4.
//
// One question, one time. No follow-up flow — answering is itself a
// dismissal (nudge-actions.ts stamps website_status_dismissed_at either
// way), so this never shows twice regardless of which button gets pressed.
const OPTIONS = [
  { value: "has_website", label: "I have a website" },
  { value: "social_only", label: "I only have Facebook or WhatsApp" },
  { value: "none", label: "I have neither" },
] as const;

export function WebsiteQuestion() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-ink">Quick one: do you have a website?</h2>
        <form action={dismissWebsiteQuestion}>
          <button type="submit" aria-label="Dismiss" className="text-gray-400 transition hover:text-gray-600">
            ×
          </button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <form key={opt.value} action={answerWebsiteQuestion}>
            <input type="hidden" name="status" value={opt.value} />
            <button
              type="submit"
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              {opt.label}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
