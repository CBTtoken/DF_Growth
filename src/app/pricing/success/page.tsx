import { BrandHeader } from "@/components/brand/BrandHeader";

export default function PricingSuccessPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-gray-50 p-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle at center, var(--brand), transparent 70%)" }}
      />
      <div className="relative">
        <BrandHeader />
      </div>
      <div className="relative flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payment received</h1>
        <p className="text-sm text-gray-500">
          Check your email for a magic link to get started — it lands you straight in your
          onboarding wizard, no password needed.
        </p>
      </div>
    </main>
  );
}
