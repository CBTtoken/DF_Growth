import { BrandHeader } from "@/components/brand/BrandHeader";

export default function PricingSuccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payment received</h1>
        <p className="text-sm text-gray-500">
          Check your email for a magic link to get started. It lands you straight in your onboarding
          wizard, no password needed.
        </p>
      </div>
    </main>
  );
}
