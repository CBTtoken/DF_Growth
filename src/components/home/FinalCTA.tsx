import Link from "next/link";
import { ArrowRight } from "lucide-react";

// One closing call to action. href is "#pricing" when the plan cards are on
// the same page (the pricing page) and "/pricing#pricing" from the home
// page, where the cards are not.
export function FinalCTA({ href = "/pricing#pricing", label = "Start Free, No Card Required" }: { href?: string; label?: string }) {
  return (
    <section className="bg-brand-blue py-10 lg:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-white font-extrabold text-2xl lg:text-3xl leading-tight">
          This Could Be Your Business
        </h2>
        <p className="mt-2 text-base text-white/85 leading-relaxed max-w-2xl mx-auto">
          Join today and get found by customers who are already looking.
        </p>
        <div className="mt-5">
          <Link href={href} className="btn-accent-lg">
            {label}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
