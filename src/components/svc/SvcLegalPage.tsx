/**
 * The shell for SVC's legal pages.
 *
 * Handoff 3.5: terms, privacy and the POPIA notice are with SVC's legal
 * team and will be supplied before go live. These pages render the supplied
 * text once it exists and a clearly marked placeholder until then. Nothing
 * here drafts, amends or summarises legal text.
 *
 * When the text arrives, paste each document into its page file as the
 * `suppliedText` prop (plain paragraphs split on blank lines) and the
 * placeholder disappears on its own.
 */
export function SvcLegalPage({
  title,
  documentName,
  suppliedText,
}: {
  title: string;
  documentName: string;
  suppliedText?: string;
}) {
  const paragraphs = suppliedText
    ?.split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <section className="bg-svc-ink px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">{title}</h1>
        </div>
      </section>
      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          {paragraphs && paragraphs.length > 0 ? (
            <div className="space-y-4 text-base leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <div className="border-2 border-svc-blue bg-white/60 p-6">
              <h2 className="font-svc-heading text-lg font-bold text-svc-blue">
                This document is being finalised
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-relaxed">
                The {documentName} for Smart Value Club is with our legal team
                and will be published here before the club goes live. If you
                need it sooner, ask us through the contact page and we will
                send it to you as soon as it is available.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
