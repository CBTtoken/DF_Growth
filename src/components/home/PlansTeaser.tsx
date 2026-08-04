import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

// The two plans on the home page, in plain language, per the split handoff:
// Foundation and Growth only, side by side, no signup forms and no
// Enterprise. The full detail, the toggle and the real signup cards live on
// /pricing; this section's one job is to say what each plan is for and send
// people there.
const plans = [
  {
    name: "Foundation",
    price: "R100/month",
    priceNote: "Free for 7 days first, no card required. Or R900/year.",
    line: "Your business online, properly.",
    points: [
      "A professional page at your own link",
      "A place on the marketplace",
      "Customer enquiries straight to you",
      "KatisoBiz quoting and invoicing, free plan",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "R180/month",
    priceNote: "Or R1,199/year. Everything in Foundation, plus:",
    line: "For businesses ready to reach more customers.",
    points: [
      "Take bookings and sell products from your page",
      "See how many people visit your page",
      "Ready-made social media images",
      "KatisoBiz R49 plan features, switched on by us",
    ],
    highlighted: true,
  },
];

export function PlansTeaser() {
  return (
    <section className="bg-neutral-light py-10 lg:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 lg:mb-8 max-w-xl">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="section-heading text-2xl lg:text-3xl">Two Plans, Plain And Simple</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-6 flex flex-col ${
                plan.highlighted ? "border-2 border-brand-blue shadow-card-hover" : "border border-neutral-border shadow-card"
              }`}
            >
              <h3 className="text-lg font-extrabold text-neutral-ink">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-neutral-ink">{plan.price}</p>
              <p className="mt-1 text-xs text-neutral-muted">{plan.priceNote}</p>
              <p className="mt-3 text-sm font-semibold text-neutral-ink">{plan.line}</p>
              <ul className="mt-3 space-y-2">
                {plan.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-neutral-mid">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand-blue" strokeWidth={2.5} />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing#pricing"
                className={`mt-5 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-bold transition ${
                  plan.highlighted
                    ? "bg-brand-blue text-white hover:bg-brand-blue-dark"
                    : "border border-neutral-border text-neutral-ink hover:border-brand-blue/40"
                }`}
              >
                {plan.name === "Foundation" ? "Start Free" : "Start Growing"}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-neutral-mid">
          Every inclusion, the annual prices and the fine detail live on the{" "}
          <Link href="/pricing" className="font-bold text-brand-blue hover:text-brand-blue-dark transition-colors">
            full pricing page →
          </Link>
        </p>
      </div>
    </section>
  );
}
