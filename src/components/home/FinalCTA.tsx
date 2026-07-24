import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
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
          <Link href="#pricing" className="btn-accent-lg">
            See Pricing
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
