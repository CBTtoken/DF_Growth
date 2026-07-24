import { Store, Users, MessagesSquare } from "lucide-react";

const items = [
  {
    icon: Store,
    title: "DigitalFlyer Marketplace",
    body: "A shared directory where customers can discover your business alongside other DigitalFlyer members.",
  },
  {
    icon: Users,
    title: "RE:Biz Nomads",
    body: "A private community of South African business owners, deals, support, and real conversations.",
  },
  {
    icon: MessagesSquare,
    title: "BizUp",
    body: "In-chat messaging and payments, so you can talk to and get paid by customers in one place.",
  },
];

export function WhatYouGet() {
  return (
    <section id="marketplace" className="bg-white py-10 lg:py-14 border-b border-neutral-border scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 lg:mb-8">
          <p className="section-eyebrow">Included In Every Tier</p>
          <h2 className="section-heading text-2xl lg:text-3xl">What You Also Get Access To</h2>
          <p className="mt-1.5 text-sm text-neutral-mid leading-relaxed">
            Every tier includes all three, at no extra cost.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col p-5 rounded-xl border border-neutral-border hover:border-brand-blue/30 hover:bg-brand-blue-light/40 transition-colors duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-blue flex items-center justify-center mb-3">
                  <Icon size={22} className="text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-neutral-ink mb-1.5">{item.title}</h3>
                <p className="text-sm text-neutral-mid leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
