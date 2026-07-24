import { Globe2, BadgeCheck, TrendingUp, Network } from "lucide-react";

const items = [
  {
    icon: Globe2,
    title: "Built For South Africa",
    body: "Designed specifically for South African entrepreneurs and small businesses.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent Pricing",
    body: "No hidden fees. No confusing contracts. No surprises.",
  },
  {
    icon: TrendingUp,
    title: "Start Small",
    body: "Only pay for what your business needs today. Upgrade whenever you're ready.",
  },
  {
    icon: Network,
    title: "More Than Software",
    body: "You're joining a growing business ecosystem built to enable and connect South African business owners.",
  },
];

export function WhyChoose() {
  return (
    <section className="bg-white py-10 lg:py-14 border-b border-neutral-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex gap-4 items-start p-4 lg:p-5 rounded-xl border border-neutral-border bg-white hover:border-brand-blue/30 hover:bg-brand-blue-light/40 transition-colors duration-200"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-blue flex items-center justify-center">
                  <Icon size={20} className="text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-ink mb-1">{item.title}</h3>
                  <p className="text-xs text-neutral-mid leading-relaxed">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
