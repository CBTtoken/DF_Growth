import { readableTextOn } from "@/lib/color";

// Visual stand-in for the real LeadForm, used only on template preview
// pages (src/app/preview/[templateId]) where there's no real
// growthClientId/landingPageId to bind a submission to. Same markup/style
// as the real thing so the preview is honest about what a template looks
// like — inputs are just non-interactive here, not wired to anything.
export function PreviewLeadForm({ primaryColor }: { primaryColor: string }) {
  const buttonTextColor = readableTextOn(primaryColor);

  return (
    <section id="lead-form" className="scroll-mt-8" style={{ backgroundColor: primaryColor }}>
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-8 sm:py-28">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-black/10 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Get in touch</h2>
          <p className="mt-2 text-gray-500">We&apos;ll respond within one business day.</p>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <div className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-400 flex items-center">
                Your name
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-400 flex items-center">
                you@example.com
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
