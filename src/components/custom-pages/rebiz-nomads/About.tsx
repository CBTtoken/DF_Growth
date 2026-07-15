export function About() {
  return (
    <section className="bg-gray-50 px-6 py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
        <span className="font-badge text-xs uppercase tracking-[0.25em] text-brand">
          Who&apos;s Behind This
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Same Platform. Real Community.
        </h2>
        <p className="text-base leading-relaxed text-gray-500 sm:text-lg">
          DigitalFlyer SA has been building for South African business owners since 2017. RE:Biz
          is the private community we built on top of it — exclusively for DigitalFlyer members
          who want more than just a page.
        </p>
        <p className="rounded-2xl border border-brand/15 bg-white px-6 py-4 text-sm font-medium text-ink">
          RE:Biz is included with your DigitalFlyer membership. It&apos;s not sold separately.
          When you join DigitalFlyer, you automatically get access to this serious business
          network.
        </p>
      </div>
    </section>
  );
}
