import Link from "next/link";
import { MousePointerClick, ClipboardList, Wallet, Eye, ArrowRight } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: MousePointerClick,
    title: "Select Your Membership",
    body: "Choose Foundation or Growth, whichever fits your business today. Change any time.",
  },
  {
    num: "02",
    icon: ClipboardList,
    title: "Complete The Onboarding Prompts",
    body: "A guided step-by-step wizard captures your business details, brand look and content in minutes.",
  },
  {
    num: "03",
    icon: Wallet,
    title: "Pay",
    body: "Simple, secure checkout via Paystack. Foundation starts free for 7 days, no card required.",
  },
  {
    num: "04",
    icon: Eye,
    title: "Review, Edit & Share",
    body: "Preview your page, make any changes you like, then start sharing your link everywhere.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-light py-10 lg:py-14 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 lg:mb-8">
          <div>
            <p className="section-eyebrow">Getting Started</p>
            <h2 className="section-heading text-2xl lg:text-3xl">How It Works</h2>
          </div>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-brand-blue font-bold text-sm hover:text-brand-blue-dark transition-colors group shrink-0"
          >
            See every real screen
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-white border border-neutral-border rounded-xl p-5 shadow-card flex gap-4 hover:border-brand-blue/30 transition-colors duration-200"
              >
                <div className="shrink-0 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-black text-brand-blue tracking-wider">{step.num}</span>
                  <div className="w-11 h-11 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                    <Icon size={22} className="text-brand-blue" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="pt-0.5">
                  <h3 className="text-sm font-bold text-neutral-ink mb-1.5">{step.title}</h3>
                  <p className="text-sm text-neutral-mid leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
