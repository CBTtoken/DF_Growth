export function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brand">
        Step {step} of {totalSteps}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i < step ? "var(--brand)" : "#e5e7eb" }}
          />
        ))}
      </div>
    </div>
  );
}
