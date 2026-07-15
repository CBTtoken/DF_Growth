const BENEFITS = [
  {
    title: "Your Professional DigitalFlyer Business Page",
    description: "Built and live fast. E-commerce, bookings and payments included.",
  },
  {
    title: "Private RE:Biz Deal Room",
    description: "Real B2B opportunities, leads and partnerships with serious business owners only.",
  },
  {
    title: "Direct Exposure to Other Growing Businesses",
    description: "Get seen by members who are actively looking for partners and suppliers.",
  },
  {
    title: "Monthly Founder Sessions",
    description: "Practical, moderated sessions focused on real challenges members are facing.",
  },
];

export function Benefits() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
        <span className="font-badge text-xs uppercase tracking-[0.25em] text-brand">
          What You Actually Get as a DigitalFlyer Member
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          More Than a Page. A Real Business Network.
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
              ✔
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink">{b.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{b.description}</p>
            </div>
          </div>
        ))}

        {/* Distinct styling from the four confirmed benefits above — this
            one is explicitly "Coming Soon" in the source content, a
            different confidence level than the rest, and worth not
            blending in as if it were already live. */}
        <div className="flex items-start gap-4 rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            ✔
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">
              BizUp <span className="font-normal text-gray-400">(Coming Soon)</span>
            </h3>
            <p className="mt-1 text-sm text-gray-500">The game changer for communication and sales.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
